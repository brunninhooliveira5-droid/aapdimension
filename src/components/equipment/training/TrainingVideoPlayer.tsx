import { useMemo } from "react";

interface Props {
  videoUrl: string;
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  // Direct video link
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return url;
  return null;
}

export const TrainingVideoPlayer = ({ videoUrl }: Props) => {
  const embedUrl = useMemo(() => getEmbedUrl(videoUrl), [videoUrl]);
  if (!embedUrl) return null;

  const isDirect = /\.(mp4|webm|ogg)(\?|$)/i.test(videoUrl);

  if (isDirect) {
    return (
      <video controls className="w-full rounded-lg bg-black aspect-video">
        <source src={embedUrl} />
      </video>
    );
  }

  return (
    <iframe
      src={embedUrl}
      className="w-full rounded-lg aspect-video border-0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
};
