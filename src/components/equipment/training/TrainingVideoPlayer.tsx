interface Props {
  videoUrl: string;
}

export const TrainingVideoPlayer = ({ videoUrl }: Props) => {
  if (!videoUrl) return null;

  return (
    <video
      controls
      controlsList="nodownload"
      className="w-full rounded-lg bg-black aspect-video"
      preload="metadata"
    >
      <source src={videoUrl} />
      Seu navegador não suporta reprodução de vídeo.
    </video>
  );
};
