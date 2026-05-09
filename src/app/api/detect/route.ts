import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { image } = await req.json(); // รับรูป Base64 จากหน้าบ้าน
    
    const API_KEY = process.env.ROBOFLOW_API_KEY; 
    const MODEL_ID = process.env.ROBOFLOW_MODEL_ID;

    // Roboflow API
    const response = await fetch(
      `https://detect.roboflow.com/${MODEL_ID}?api_key=${API_KEY}`,
      {
        method: "POST",
        body: image, 
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const data = await response.json();

    // Send Resut to Frontend
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error detecting:", error);
    return NextResponse.json({ error: "Failed to detect" }, { status: 500 });
  }
}