import Icon from '@/components/ui/icon';

interface Props {
  url: string | null;
  onClose: () => void;
}

const Lightbox = ({ url, onClose }: Props) => {
  if (!url) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={onClose}>
        <Icon name="X" size={32} />
      </button>
      <img src={url} alt="" className="max-w-full max-h-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  );
};

export default Lightbox;
