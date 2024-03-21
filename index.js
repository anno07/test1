require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use(helmet());

const supplierRouter = require("./controllers/supplier");
const costCenterRouter = require("./controllers/costCenter");
const inventoryRouter = require("./controllers/inventory");
const categoryRouter = require("./controllers/category");
const materialRouter = require("./controllers/material");
const reportRouter = require("./controllers/report");
const addPermissionRouter = require("./controllers/addPermission");
const outPermissionRouter = require("./controllers/outPermission");

app.use('/api/supplier', supplierRouter);
app.use('/api/costCenter', costCenterRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/category', categoryRouter);
app.use('/api/material', materialRouter);
app.use('/api/report', reportRouter);
app.use('/api/addPermission', addPermissionRouter);
app.use('/api/outPermission', outPermissionRouter);

app.use((req, res, next) => { res.status(404).json({ msg: "Route Not Found" }); })
app.use((error, req, res, next) => {
    console.log(error)
    const statusCode = error.statusCode || 500;
    const msg = error.message || "Something Went Wrong";
    res.status(statusCode).json({ msg })
})

const start = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        app.listen(port, console.log("Server Is Running..."));
    } catch (error) { console.log(error); }
};
start();