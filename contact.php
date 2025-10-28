<?php
/**
 * PLUGNATION STUDIOS - Advanced Contact System
 * Enhanced with spam protection, file upload, and email notifications
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers for CORS and JSON response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

class PlugnationContact {
    private $dataFile = 'data/contacts.json';
    private $uploadDir = 'uploads/contacts/';
    private $maxFileSize = 5 * 1024 * 1024; // 5MB
    private $allowedTypes = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
    
    public function __construct() {
        $this->initializeDirectories();
    }
    
    private function initializeDirectories() {
        if (!file_exists('data')) {
            mkdir('data', 0755, true);
        }
        if (!file_exists($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }
    }
    
    public function handleRequest() {
        try {
            if ($_SERVER['REQUEST_METHOD'] == 'POST') {
                $this->processContactForm();
            } elseif ($_SERVER['REQUEST_METHOD'] == 'GET') {
                $this->getContactSubmissions();
            } else {
                throw new Exception('Method not allowed');
            }
        } catch (Exception $e) {
            $this->sendResponse(false, $e->getMessage(), null, 400);
        }
    }
    
    private function processContactForm() {
        // Validate spam protection
        $this->validateSpamProtection();
        
        // Get and validate form data
        $formData = $this->getFormData();
        $this->validateFormData($formData);
        
        // Handle file upload if present
        $attachments = $this->handleFileUpload();
        
        // Save contact submission
        $submission = $this->saveContactSubmission($formData, $attachments);
        
        // Send email notifications
        $this->sendEmailNotifications($submission);
        
        // Send success response
        $this->sendResponse(true, 'Thank you for your message! We will get back to you within 24 hours.', $submission);
    }
    
    private function validateSpamProtection() {
        // Honeypot field validation
        if (!empty($_POST['website'])) {
            throw new Exception('Spam detected');
        }
        
        // Time-based spam protection (form should take at least 3 seconds to fill)
        if (isset($_POST['form_start_time'])) {
            $formTime = time() - intval($_POST['form_start_time']);
            if ($formTime < 3) {
                throw new Exception('Form submitted too quickly');
            }
        }
        
        // Basic bot detection
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        if (empty($userAgent) || strlen($userAgent) < 10) {
            throw new Exception('Invalid user agent');
        }
    }
    
    private function getFormData() {
        return [
            'name' => trim($_POST['name'] ?? ''),
            'email' => trim($_POST['email'] ?? ''),
            'phone' => trim($_POST['phone'] ?? ''),
            'company' => trim($_POST['company'] ?? ''),
            'service' => trim($_POST['service'] ?? ''),
            'budget' => trim($_POST['budget'] ?? ''),
            'timeline' => trim($_POST['timeline'] ?? ''),
            'message' => trim($_POST['message'] ?? ''),
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
            'submitted_at' => date('Y-m-d H:i:s')
        ];
    }
    
    private function validateFormData($data) {
        $required = ['name', 'email', 'message'];
        
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("Please fill in the $field field");
            }
        }
        
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Please enter a valid email address');
        }
        
        if (strlen($data['message']) < 10) {
            throw new Exception('Please provide a more detailed message (at least 10 characters)');
        }
        
        if (strlen($data['name']) < 2) {
            throw new Exception('Please enter your full name');
        }
    }
    
    private function handleFileUpload() {
        $attachments = [];
        
        if (isset($_FILES['attachments'])) {
            $files = $this->rearrangeFiles($_FILES['attachments']);
            
            foreach ($files as $file) {
                if ($file['error'] === UPLOAD_ERR_OK) {
                    $attachments[] = $this->processSingleFile($file);
                }
            }
        }
        
        return $attachments;
    }
    
    private function rearrangeFiles($files) {
        $rearranged = [];
        $fileCount = count($files['name']);
        
        for ($i = 0; $i < $fileCount; $i++) {
            if ($files['error'][$i] === UPLOAD_ERR_NO_FILE) continue;
            
            $rearranged[] = [
                'name' => $files['name'][$i],
                'type' => $files['type'][$i],
                'tmp_name' => $files['tmp_name'][$i],
                'error' => $files['error'][$i],
                'size' => $files['size'][$i]
            ];
        }
        
        return $rearranged;
    }
    
    private function processSingleFile($file) {
        // Check file size
        if ($file['size'] > $this->maxFileSize) {
            throw new Exception('File size too large. Maximum 5MB allowed.');
        }
        
        // Check file type
        $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($fileExtension, $this->allowedTypes)) {
            throw new Exception('Invalid file type. Allowed: ' . implode(', ', $this->allowedTypes));
        }
        
        // Generate unique filename
        $filename = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9\._-]/', '_', $file['name']);
        $filepath = $this->uploadDir . $filename;
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filepath)) {
            throw new Exception('Failed to upload file');
        }
        
        return [
            'original_name' => $file['name'],
            'saved_name' => $filename,
            'file_path' => $filepath,
            'file_size' => $file['size'],
            'file_type' => $file['type']
        ];
    }
    
    private function saveContactSubmission($data, $attachments) {
        $submissions = $this->getSubmissions();
        
        $submission = [
            'id' => uniqid('contact_'),
            'data' => $data,
            'attachments' => $attachments,
            'status' => 'new',
            'read' => false,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $submissions[] = $submission;
        
        if (!file_put_contents($this->dataFile, json_encode($submissions, JSON_PRETTY_PRINT))) {
            throw new Exception('Failed to save contact submission');
        }
        
        return $submission;
    }
    
    private function getSubmissions() {
        if (!file_exists($this->dataFile)) {
            return [];
        }
        
        $data = file_get_contents($this->dataFile);
        return $data ? json_decode($data, true) : [];
    }
    
    private function sendEmailNotifications($submission) {
        $to = "info@plugnationstudios.com"; // Replace with your email
        $subject = "New Contact Form Submission - PLUGNATION STUDIOS";
        
        $message = $this->buildEmailMessage($submission);
        $headers = $this->buildEmailHeaders($submission);
        
        // Send email
        if (!mail($to, $subject, $message, $headers)) {
            // Log email failure but don't show error to user
            error_log("Failed to send contact form email for: " . $submission['data']['email']);
        }
        
        // Send auto-reply to user
        $this->sendAutoReply($submission);
    }
    
    private function buildEmailMessage($submission) {
        $data = $submission['data'];
        
        $message = "PLUGNATION STUDIOS - New Contact Form Submission\n\n";
        $message .= "============================================\n\n";
        $message .= "Contact Details:\n";
        $message .= "Name: {$data['name']}\n";
        $message .= "Email: {$data['email']}\n";
        $message .= "Phone: {$data['phone']}\n";
        $message .= "Company: {$data['company']}\n\n";
        
        $message .= "Project Details:\n";
        $message .= "Service: {$data['service']}\n";
        $message .= "Budget: {$data['budget']}\n";
        $message .= "Timeline: {$data['timeline']}\n\n";
        
        $message .= "Message:\n";
        $message .= "{$data['message']}\n\n";
        
        $message .= "Technical Details:\n";
        $message .= "Submitted: {$data['submitted_at']}\n";
        $message .= "IP Address: {$data['ip_address']}\n";
        
        if (!empty($submission['attachments'])) {
            $message .= "\nAttachments: " . count($submission['attachments']) . " file(s)\n";
        }
        
        return $message;
    }
    
    private function buildEmailHeaders($submission) {
        $data = $submission['data'];
        
        $headers = "From: PLUGNATION STUDIOS <noreply@plugnationstudios.com>\r\n";
        $headers .= "Reply-To: {$data['email']}\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();
        
        return $headers;
    }
    
    private function sendAutoReply($submission) {
        $data = $submission['data'];
        $to = $data['email'];
        $subject = "Thank You for Contacting PLUGNATION STUDIOS";
        
        $message = $this->buildAutoReplyMessage($data);
        $headers = "From: PLUGNATION STUDIOS <info@plugnationstudios.com>\r\n";
        
        mail($to, $subject, $message, $headers);
    }
    
    private function buildAutoReplyMessage($data) {
        $message = "Dear {$data['name']},\n\n";
        $message .= "Thank you for contacting PLUGNATION STUDIOS!\n\n";
        $message .= "We have received your message and will get back to you within 24 hours.\n\n";
        
        $message .= "Here's a summary of your inquiry:\n";
        $message .= "Service: {$data['service']}\n";
        $message .= "Message: " . substr($data['message'], 0, 100) . "...\n\n";
        
        $message .= "What happens next?\n";
        $message .= "1. Our team will review your requirements\n";
        $message .= "2. We'll contact you to discuss your project in detail\n";
        $message .= "3. We'll provide a customized proposal and timeline\n\n";
        
        $message .= "In the meantime, you can:\n";
        $message .= "• Browse our services: https://plugnationstudios.com/services\n";
        $message .= "• View our portfolio: https://plugnationstudios.com/portfolio\n";
        $message .= "• Check our pricing: https://plugnationstudios.com/pricing\n\n";
        
        $message .= "Best regards,\n";
        $message .= "Marshall Kyalla Junior\n";
        $message .= "Founder & Lead Developer\n";
        $message .= "PLUGNATION STUDIOS\n";
        $message .= "Email: info@plugnationstudios.com\n";
        $message .= "Phone: +254 XXX XXX XXX\n\n";
        $message .= "\"Where divine light meets street hustle\"";
        
        return $message;
    }
    
    private function getContactSubmissions() {
        $submissions = $this->getSubmissions();
        
        // Filter sensitive data for public API
        $filteredSubmissions = array_map(function($submission) {
            return [
                'id' => $submission['id'],
                'name' => $submission['data']['name'],
                'service' => $submission['data']['service'],
                'status' => $submission['status'],
                'read' => $submission['read'],
                'created_at' => $submission['created_at']
            ];
        }, $submissions);
        
        $this->sendResponse(true, 'Contact submissions retrieved', [
            'total' => count($filteredSubmissions),
            'submissions' => $filteredSubmissions
        ]);
    }
    
    private function sendResponse($success, $message, $data = null, $httpCode = 200) {
        http_response_code($httpCode);
        
        echo json_encode([
            'success' => $success,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
        exit;
    }
}

// Initialize and handle the request
$contactSystem = new PlugnationContact();
$contactSystem->handleRequest();
?>