'use client';
import { useEffect } from 'react';
import Image from "next/image";
import type { ImageProps } from "next/image";

// INSTITUTIONAL BINARY IMAGE RENDERER
// Version: 2.0.0
export default function CachedImage(props: ImageProps) {
  const { src } = props;

  // 🛡️ MEMORY LEAK PROTECTION
  // If the src is an object URL (blob:...), we must be careful.
  // However, since we manage object URLs in LogoDB, we only revoke them
  // when we purge the DB or update a specific key.
  // This component simply renders what it's given.

  const isBlob = typeof src === 'string' && src.startsWith('blob:');

  // For high-performance binary blobs, we bypass Next.js image optimization
  // and use unoptimized to ensure zero lag and direct browser rendering.
  return <Image {...props} alt={props.alt} unoptimized={isBlob || props.unoptimized} />;
}
