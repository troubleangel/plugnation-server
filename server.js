// 🚀 PLUGNATION SERVER — GOD MODE 2026+ SELF-HEALING CLOUD EDITION (LIVE GOD MODE)
import dotenv from "dotenv";
dotenv.config();

import cluster from "cluster";
import os from "os";
import express from "express";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import moment from "moment";
import chalk from "chalk";
import morgan from "morgan";
import cron from "node-cron";
import { createClient } from "redis";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

// Routes
import apiRoutes from "./routes/apiRoutes.js";
import hostingRoutes from './routes/hostingRoutes.js';
import monetizationRoutes from "./routes/monetizationRoutes.js";
import mpesaRoutes from "./routes/mpesaRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import plansRoutes from "./routes/plansRoutes.js";
import ticketsRoutes from "./routes/ticketsRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";

// Models
import Client from "./models/Client.js";
import Payment from "./models/Payment.js";
import Hosting from "./models/Hosting.js";
import Notification from "./models/Notification.js";
import Stat from "./models/Stat.js";

// ===================================================
// Constants
// ===================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================================================
// 🧠 MASTER PROCESS
// ===================================================
if (cluster.isPrimary) {
  process.title = "PlugNation-Master";
  const cores = Math.max(1, os.cpus().length);
  console.log(chalk.yellow(`🧠 Master PID: ${process.pid}`));
  console.log(chalk.green(`💪 Launching ${cores} worker(s)...`));

  const REDIS_ENABLED = String(process.env.REDIS_ENABLED || "false").toLowerCase() === "true";
  let masterRedis = null;
  let redisErrorLogged = false;

  async function connectRedis() {
    if (!REDIS_ENABLED) {
      console.log(chalk.yellow("⚠️ Redis disabled — running in stub cache mode"));
      return;
    }
    try {
      const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
      masterRedis = createClient({ url, socket: { connectTimeout: 5000 } });
      masterRedis.on("error", (e) => {
        if (!redisErrorLogged) {
          redisErrorLogged = true;
          console.log(chalk.red("⚠️ Redis connection error:"), e.message);
        }
      });
      await masterRedis.connect();
      console.log(chalk.green("⚡ Master Redis connected"));
    } catch (err) {
      console.log(chalk.yellow("⚠️ Redis failed to connect — retrying in 5s..."));
      setTimeout(connectRedis, 5000);
    }
  }
  connectRedis();

  // Spawn workers
  for (let i = 0; i < cores; i++) cluster.fork();

  // Redis IPC
  cluster.on("message", async (worker, msg) => {
    if (!msg || !msg.__redis_req) return;
    const { reqId, op, key, value } = msg;
    const reply = { __redis_res: true, reqId, ok: false };
    try {
      if (!masterRedis) reply.ok = true;
      else if (op === "get") reply.result = await masterRedis.get(key), (reply.ok = true);
      else if (op === "set") await masterRedis.set(key, value), (reply.ok = true);
      else if (op === "del") await masterRedis.del(key), (reply.ok = true);
    } catch (e) {
      reply.ok = false;
      reply.error = e.message;
    }
    worker.send(reply);
  });

  cluster.on("exit", (worker) => {
    console.log(chalk.red(`❌ Worker ${worker.process.pid} crashed — restarting...`));
    cluster.fork();
  });

  process.on("SIGINT", async () => {
    console.log("🛑 Master shutting down gracefully...");
    try { if (masterRedis) await masterRedis.quit(); } catch {}
    for (const id in cluster.workers) cluster.workers[id].kill();
    process.exit(0);
  });
}

// ===================================================
// 🚀 WORKER PROCESS
// ===================================================
else {
  process.title = `PlugNation-Worker-${process.pid}`;

  const app = express();
  const httpServer = createServer(app);
  const io = new IOServer(httpServer, { cors: { origin: "*" } });

  // Middleware
  app.use(cors());
  app.use(helmet());
  app.use(compression());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(morgan("dev"));
  app.use(express.static(path.join(__dirname, "public")));

  // Rate Limiter
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: "⏳ Too many requests — chill, genius.",
  }));

  // MongoDB connection
  const connectDB = async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/plugnation");
      console.log(chalk.green(`🧩 MongoDB connected (pid ${process.pid})`));
    } catch (err) {
      console.log(chalk.red("MongoDB connect failed — retrying in 5s..."));
      setTimeout(connectDB, 5000);
    }
  };
  connectDB();

  // Redis IPC helper
  function redisRequest(op, key, value) {
    return new Promise((resolve) => {
      const reqId = uuidv4();
      const timeout = setTimeout(() => resolve({ ok: false, error: "timeout" }), 4000);
      process.once("message", (msg) => {
        if (!msg?.__redis_res || msg.reqId !== reqId) return;
        clearTimeout(timeout);
        resolve(msg);
      });
      process.send?.({ __redis_req: true, reqId, op, key, value });
    });
  }

  // Homepage & Health
  app.get("/", (_, res) => {
    if (process.env.NODE_ENV === "production") res.redirect(process.env.BASE_URL);
    else res.sendFile(path.join(__dirname, "public", "index.html"));
  });
  app.get("/health", (_, res) => res.json({ status: "OK", pid: process.pid, time: new Date() }));

  // =============================
  // API Routes — FULL LIVE GOD MODE
  // =============================
  app.use("/api", apiRoutes);                    // General API
  app.use("/api", hostingRoutes);                // Hosting / live site API
  app.use("/api/payments", monetizationRoutes); // Live monetization
  app.use("/api/payments/mpesa", mpesaRoutes);  // MPesa integration
  app.use("/api/users", usersRoutes);           // Auth/users
  app.use("/api/plans", plansRoutes);           // Plans CRUD
  app.use("/api/tickets", ticketsRoutes);       // Tickets CRUD
  app.use("/api/analytics", analyticsRoutes);   // Analytics endpoint

  // =============================
  // 🚀 LIVE DATA ROUTES - GOD MODE
  // =============================

  // Live stats endpoint (compatible with your existing /api/stats)
  app.get("/api/stats", async (req, res) => {
    try {
      const statsDoc = await Stat.findOne();
      const base = statsDoc?.toObject?.() || { visits: 642, pending: 387, newClients: 112, payments: 53, revenue: 0 };

      const clientsCount = await Client.countDocuments();
      const pendingPayments = await Payment.countDocuments({ status: 'pending' });
      const activeSubscriptions = await Client.countDocuments({ subscriptionStatus: 'Active' });

      res.json({
        ...base,
        clients: clientsCount,
        pendingPayments,
        activeSubscriptions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Live clients endpoint
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await Client.find()
        .sort({ joined: -1 })
        .limit(10)
        .select('name tier subscriptionStatus joined');
      
      const formattedClients = clients.map(client => ({
        name: client.name,
        tier: client.tier,
        joined: moment(client.joined).format('MMM YYYY'),
        status: client.subscriptionStatus
      }));
      
      res.json(formattedClients);
    } catch (error) {
      console.error('Clients error:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  });

  // Live notifications endpoint
  app.get("/api/notifications", async (req, res) => {
    try {
      const notifications = await Notification.find()
        .sort({ time: -1 })
        .limit(10);
      
      const formattedNotifications = notifications.map(notif => ({
        title: notif.title,
        description: notif.message,
        time: moment(notif.time).fromNow(),
        type: notif.type,
        status: 'pending'
      }));
      
      res.json(formattedNotifications);
    } catch (error) {
      console.error('Notifications error:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // Serve live dashboard
  app.get("/live-dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "live-dashboard.html"));
  });

  // 🚀 ENHANCED SOCKET.IO LIVE DATA GOD MODE
  io.on("connection", (socket) => {
    console.log(chalk.green(`⚡ Socket connected: ${socket.id} (pid ${process.pid})`));

    // Send initial live data
    (async () => {
      try {
        const [statsDoc, clients, notifications] = await Promise.all([
          Stat.findOne(),
          Client.find().sort({ joined: -1 }).limit(5),
          Notification.find().sort({ time: -1 }).limit(5)
        ]);

        const stats = statsDoc || { visits: 642, pending: 387, newClients: 112, payments: 53, revenue: 0 };
        socket.emit("liveStats", stats);
        socket.emit("clientsUpdate", clients);
        socket.emit("notificationsUpdate", notifications);
        socket.emit("systemStatus", { 
          status: "connected", 
          pid: process.pid,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Initial data error:', error);
      }
    })();

    // Live data update handlers
    socket.on("requestStatsUpdate", async () => {
      try {
        const stats = (await Stat.findOne()) || {};
        socket.emit("statsUpdate", stats);
      } catch (error) {
        console.error('Stats update error:', error);
      }
    });

    socket.on("addLiveClient", async (clientData) => {
      try {
        const newClient = new Client({
          ...clientData,
          subscriptionStatus: 'Active',
          joined: new Date()
        });
        await newClient.save();
        
        // Notify all connected clients
        const clients = await Client.find().sort({ joined: -1 }).limit(5);
        io.emit("clientsUpdate", clients);
        
        // Create notification
        const notification = new Notification({
          type: "new-client",
          title: "NEW CLIENT",
          message: `${clientData.name} has joined PlugNation`,
          time: new Date()
        });
        await notification.save();
        io.emit("notificationsUpdate", [notification]);
        
      } catch (error) {
        console.error('Add client error:', error);
        socket.emit("error", { message: "Failed to add client" });
      }
    });

    socket.on("updateLiveStats", async (newStats) => {
      try {
        let stats = await Stat.findOne();
        if (stats) {
          Object.assign(stats, newStats);
          await stats.save();
        } else {
          stats = await Stat.create(newStats);
        }
        io.emit("statsUpdate", stats);
      } catch (error) {
        console.error('Update stats error:', error);
      }
    });

    socket.on("disconnect", () => {
      console.log(chalk.yellow(`🔌 Socket disconnected: ${socket.id}`));
    });
  });

  // 🚀 ENHANCED CRON: REAL-TIME DATA SYNC
  cron.schedule("*/5 * * * * *", async () => { // Every 5 seconds for live updates
    try {
      const totalClients = await Client.countDocuments();
      const pendingCount = await Payment.countDocuments({ status: 'pending' });
      const revenueResult = await Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      let stats = await Stat.findOne();
      if (!stats) {
        stats = await Stat.create({
          visits: 642,
          pending: pendingCount,
          newClients: totalClients,
          payments: await Payment.countDocuments({ status: 'completed' }),
          revenue: revenueResult[0]?.total || 0,
        });
      } else {
        stats.visits += Math.floor(Math.random() * 3);
        stats.pending = pendingCount;
        stats.newClients = totalClients;
        stats.payments = await Payment.countDocuments({ status: 'completed' });
        stats.revenue = revenueResult[0]?.total || 0;
        await stats.save();
      }

      io.emit("liveStats", stats);
      
      // Check for new notifications
      const newNotifications = await Notification.find()
        .sort({ time: -1 })
        .limit(3);
      
      if (newNotifications.length > 0) {
        io.emit("notificationsUpdate", newNotifications);
      }

    } catch (error) {
      console.error('Cron job error:', error);
    }
  });

  // Daily maintenance (keep your existing daily cron)
  cron.schedule("0 0 * * *", async () => {
    console.log(chalk.blue(`[${moment().format("YYYY-MM-DD HH:mm")}] Daily maintenance running...`));

    // 1️⃣ Auto-downgrade expired clients
    const now = new Date();
    const expiredClients = await Client.find({ subscriptionStatus: "Active", subscriptionExpiry: { $lte: now } });
    for (let client of expiredClients) {
      client.subscriptionStatus = "None";
      client.tier = "Free";
      await client.save();
      io.emit("tierChanged", client);
      await Notification.create({
        type: "system",
        title: `${client.name} downgraded due to expiry`,
        message: "",
      });
    }

    // 2️⃣ Update global stats
    const paymentsCount = await Payment.countDocuments();
    const revenueSum = await Payment.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
    let stats = await Stat.findOne();
    if (!stats) stats = await Stat.create({ payments: paymentsCount, revenue: revenueSum[0]?.total || 0 });
    else { stats.payments = paymentsCount; stats.revenue = revenueSum[0]?.total || 0; await stats.save(); }
    io.emit("liveStats", stats);
  });

  // Start Server
  const PORT = parseInt(process.env.PORT || "8080", 10);
  httpServer.listen(PORT, () => {
    console.log(chalk.cyan(`🚀 PlugNation Server active on port ${PORT} | PID ${process.pid}`));
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log(chalk.yellow(`Worker ${process.pid} shutting down...`));
    process.exit(0);
  });

  // Attach io for live events in routes
  app.set("io", io);
}