"use client"

import Image from "next/image";
import "bootstrap/dist/css/bootstrap.min.css"
import Link from 'next/link'

export default function Home() {
  return (
     <>
      <Link href="/welcome">Authentication</Link>{" | "}
      <Link href="/signin">Sign in</Link>
      <Link href="/signup">Sign up</Link>
      <Link href="/register">Register</Link>
    </>
  );
}
