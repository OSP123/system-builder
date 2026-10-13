/* eslint-disable @next/next/no-img-element -- uploads are served from our own route, not optimized via next/image yet */
import { publicUrl } from "@/lib/storage";

type Props = {
  media: { key: string; alt: string | null; originalName: string } | null | undefined;
  className?: string;
};

export function MediaImage({ media, className }: Props) {
  if (!media) return null;
  return <img src={publicUrl(media.key)} alt={media.alt ?? ""} className={className} loading="lazy" />;
}
