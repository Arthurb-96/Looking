import { NextResponse } from "next/server";
import getClient from "@/app/lib/mongodb";

export async function POST(req) {
  try {
    const { userEmail, jobType, serviceType, priceRange, area, createdAt } = await req.json();
    
    if (!userEmail || !jobType || !serviceType || !priceRange || !area) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!["hiring", "offering"].includes(jobType)) {
      return NextResponse.json({ error: "Invalid job type" }, { status: 400 });
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    const users = db.collection("users");

    const jobData = {
      serviceType,
      priceRange,
      area,
      createdAt,
      id: new Date().getTime().toString() // Simple ID generation
    };

    // Update user document to add job to the appropriate category
    await users.updateOne(
      { email: userEmail },
      { 
        $push: { 
          [`looking.${jobType}`]: { 
            $each: [jobData], 
            $position: 0 
          } 
        } 
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, jobData });
  } catch (error) {
    console.error("API /api/jobs error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}