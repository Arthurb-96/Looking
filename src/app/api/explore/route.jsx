import { NextResponse } from "next/server";
import getClient from "@/app/lib/mongodb";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get("userEmail");
    const mode = searchParams.get("mode"); // "looking" or "offering"
    const area = searchParams.get("area");
    const serviceType = searchParams.get("serviceType");
    const priceRange = searchParams.get("priceRange");

    if (!userEmail || !mode || !area) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    const users = db.collection("users");

    // Determine which collection to search based on mode
    // If user is "looking" for work, show "hiring" posts from others
    // If user is "offering" services, show "offering" posts from others
    const searchCategory = mode === "looking" ? "hiring" : "offering";

    // Find all users who have jobs in the specified category and area
    const pipeline = [
      {
        $match: {
          email: { $ne: userEmail }, // Exclude current user
          [`looking.${searchCategory}`]: { $exists: true, $ne: [] }
        }
      },
      {
        $project: {
          email: 1,
          jobs: `$looking.${searchCategory}`
        }
      },
      {
        $unwind: "$jobs"
      },
      {
        $match: {
          "jobs.area": area,
          ...(serviceType && { "jobs.serviceType": serviceType }),
          ...(priceRange && { "jobs.priceRange": { $regex: priceRange, $options: "i" } })
        }
      },
      {
        $project: {
          userEmail: "$email",
          id: "$jobs.id",
          serviceType: "$jobs.serviceType",
          priceRange: "$jobs.priceRange",
          area: "$jobs.area",
          createdAt: "$jobs.createdAt"
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ];

    const jobs = await users.aggregate(pipeline).toArray();

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("API /api/explore error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}