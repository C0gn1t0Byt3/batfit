// src/middleware/errorHandler.js
function notFoundHandler(req, res) {
    if (req.path.startsWith("/api")) { return res.status(404).json({ error: "Not found" });}
    
    return res.status(404).render("pages/notFound", { title: "Not found" });
}

function errorHandler(err, req, res, next) {
    console.error("Error:", err);

    if (req.path.startsWith("/api")) { return res.status(500).json({ error: "Server error" });}
    
    return res.status(500).render("pages/error", { title: "Error", message: "Somehing went wrong" });
}

module.exports = { notFoundHandler, errorHandler };