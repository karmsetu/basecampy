import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("mongoDB connected");
  } catch (error) {
    console.error("mongoDB connection error", error);
    process.exit(1);
  }
};
