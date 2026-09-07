const errorHandler = (err, req, res, next) => {

  console.error(err);

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid task ID"
    });
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map(
      (error) => error.message
    );

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  res.status(500).json({
    success: false,
    message: "Server error",
    error: err.message
  });
};

module.exports = errorHandler;