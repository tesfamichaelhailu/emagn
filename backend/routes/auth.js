const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { query } = require("../config/database");
const {
  authenticateToken,
  createActionLimiter,
} = require("../middleware/auth");
const {
  validateUserRegistration,
  validateUserLogin,
} = require("../middleware/validation");

const router = express.Router();

// Rate limiting for auth endpoints
const loginLimiter = createActionLimiter("login", 5, 15 * 60 * 1000); // 5 attempts per 15 minutes
const registerLimiter = createActionLimiter("register", 3, 60 * 60 * 1000); // 3 attempts per hour

// Register new user
router.post(
  "/register",
  registerLimiter,
  validateUserRegistration,
  async (req, res) => {
    try {
      const { email, password, firstName, lastName, role = "buyer" } = req.body;

      // Check if user already exists
      const existingUsers = await query(
        "SELECT id FROM users WHERE email = ?",
        [email]
      );
      if (existingUsers.length > 0) {
        return res
          .status(409)
          .json({ message: "User with this email already exists" });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Generate email verification token
      const emailVerificationToken = uuidv4();

      // Insert new user
      const result = await query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, email_verification_token) 
       VALUES (?, ?, ?, ?, ?, ?)`,
        [email, passwordHash, firstName, lastName, role, emailVerificationToken]
      );

      const userId = result.insertId;

      // Create JWT token
      const jwtOptions = {};
      if (
        process.env.JWT_EXPIRES_IN &&
        typeof process.env.JWT_EXPIRES_IN === "string" &&
        process.env.JWT_EXPIRES_IN.trim() !== ""
      ) {
        jwtOptions.expiresIn = process.env.JWT_EXPIRES_IN;
      }
      const token = jwt.sign(
        { userId, email, role },
        process.env.JWT_SECRET,
        jwtOptions
      );

      // Get user details
      const users = await query(
        "SELECT id, email, first_name, last_name, role, is_verified, created_at FROM users WHERE id = ?",
        [userId]
      );

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: users[0],
        emailVerificationRequired: true,
        verificationToken: emailVerificationToken,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  }
);

// Login user
router.post("/login", loginLimiter, validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user with password hash
    const users = await query(
      "SELECT id, email, password_hash, first_name, last_name, role, is_active, is_verified FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Create JWT token
    const jwtOptions = {};
    if (
      process.env.JWT_EXPIRES_IN &&
      typeof process.env.JWT_EXPIRES_IN === "string" &&
      process.env.JWT_EXPIRES_IN.trim() !== ""
    ) {
      jwtOptions.expiresIn = process.env.JWT_EXPIRES_IN;
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      jwtOptions
    );

    // Remove password hash from response
    delete user.password_hash;

    res.json({
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Verify email
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({ message: "Verification token is required" });
    }

    // Find user with this verification token
    const users = await query(
      "SELECT id, email, is_verified FROM users WHERE email_verification_token = ?",
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "Invalid verification token" });
    }

    const user = users[0];

    if (user.is_verified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // Update user as verified and clear token
    await query(
      "UPDATE users SET is_verified = TRUE, email_verification_token = NULL WHERE id = ?",
      [user.id]
    );

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ message: "Email verification failed" });
  }
});

// Resend verification email
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user exists and is not verified
    const users = await query(
      "SELECT id, email, is_verified FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    if (user.is_verified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // Generate new verification token
    const emailVerificationToken = uuidv4();
    await query("UPDATE users SET email_verification_token = ? WHERE id = ?", [
      emailVerificationToken,
      user.id,
    ]);

    // TODO: Send verification email
    console.log(`Verification token for ${email}: ${emailVerificationToken}`);

    res.json({
      message: "Verification email sent",
      verificationToken: emailVerificationToken, // Remove in production
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Failed to resend verification email" });
  }
});

// Get current user profile
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const users = await query(
      `SELECT id, email, first_name, last_name, role, phone, address, city, state, 
              country, postal_code, profile_image, is_verified, created_at, updated_at 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Failed to get user profile" });
  }
});

// Update user profile
router.put("/me", authenticateToken, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
    } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (firstName !== undefined) {
      updates.push("first_name = ?");
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push("last_name = ?");
      values.push(lastName);
    }
    if (phone !== undefined) {
      updates.push("phone = ?");
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push("address = ?");
      values.push(address);
    }
    if (city !== undefined) {
      updates.push("city = ?");
      values.push(city);
    }
    if (state !== undefined) {
      updates.push("state = ?");
      values.push(state);
    }
    if (country !== undefined) {
      updates.push("country = ?");
      values.push(country);
    }
    if (postalCode !== undefined) {
      updates.push("postal_code = ?");
      values.push(postalCode);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    values.push(req.user.id);

    await query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);

    // Get updated user
    const users = await query(
      `SELECT id, email, first_name, last_name, role, phone, address, city, state, 
              country, postal_code, profile_image, is_verified, created_at, updated_at 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    res.json({
      message: "Profile updated successfully",
      user: users[0],
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// Change password
router.put("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters long" });
    }

    // Get current password hash
    const users = await query("SELECT password_hash FROM users WHERE id = ?", [
      req.user.id,
    ]);
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      users[0].password_hash
    );
    if (!isValidPassword) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query("UPDATE users SET password_hash = ? WHERE id = ?", [
      newPasswordHash,
      req.user.id,
    ]);

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

// Logout (client-side token removal)
router.post("/logout", authenticateToken, (req, res) => {
  // In a stateless JWT system, logout is handled client-side by removing the token
  // For enhanced security, you could implement a token blacklist
  res.json({ message: "Logged out successfully" });
});

// Refresh token
router.post("/refresh", authenticateToken, async (req, res) => {
  try {
    // Create new token with same user data
    const jwtOptions = {};
    if (
      process.env.JWT_EXPIRES_IN &&
      typeof process.env.JWT_EXPIRES_IN === "string" &&
      process.env.JWT_EXPIRES_IN.trim() !== ""
    ) {
      jwtOptions.expiresIn = process.env.JWT_EXPIRES_IN;
    }
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET,
      jwtOptions
    );

    res.json({
      message: "Token refreshed successfully",
      token,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({ message: "Failed to refresh token" });
  }
});

module.exports = router;
