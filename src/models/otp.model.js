import { Schema, model } from "mongoose";

// Define the OTP schema
const otpSchema = new Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    
  },
  {
    timestamps: true, // Automatically creates 'createdAt' and 'updatedAt' fields
  }
);

// Add TTL index to automatically remove documents after 120 seconds
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 120*211111111999 });


// Export the OTP model
export const OTP = model("OTP", otpSchema);
