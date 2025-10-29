import { NextResponse } from "next/server";
import getClient from "@/app/lib/mongodb";

export async function GET(req, context) {
  const { username } = await context.params;
  try {
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    const users = db.collection("users");
    const userDoc = await users.findOne({ email: username });
    const posts = userDoc?.posts || [];
    // Return posts newest first (no need to reverse since we add new posts at position 0)
    return NextResponse.json({ posts });
  } catch (e) {
    console.error("API /user/[username]/posts error:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}

export async function POST(req, context) {
  const { username } = await context.params;
  try {
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    const users = db.collection("users");
    const post = { 
      content, 
      createdAt: new Date(),
      _id: new Date().getTime().toString() // Add unique ID for deletion
    };
    // Push new post to the top of posts array
    await users.updateOne(
      { email: username },
      { $push: { posts: { $each: [post], $position: 0 } } },
      { upsert: true }
    );
    return NextResponse.json({ ok: true, postId: post._id });
  } catch (e) {
    console.error("API /user/[username]/posts error:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}

export async function DELETE(req, context) {
  const { username } = await context.params;
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');
    
    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "myapp");
    const users = db.collection("users");
    
    // Remove post from user's posts array
    const result = await users.updateOne(
      { email: username },
      { $pull: { posts: { _id: postId } } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Post not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: "Post deleted successfully" });
  } catch (e) {
    console.error("API DELETE /user/[username]/posts error:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
