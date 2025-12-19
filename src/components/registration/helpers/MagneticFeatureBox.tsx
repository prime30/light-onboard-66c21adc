import { useMagnetic } from "@/hooks/use-magnetic";

interface FeatureBoxProps {
  icon: React.ElementType;
  label: string;
  desc: string;
}

export const MagneticFeatureBox = ({
  icon: Icon,
  label,
  desc
}: FeatureBoxProps) => {
  const magnetic = useMagnetic({
    strength: 0.12
  });
  
  return (
    <div 
      ref={magnetic.ref} 
      style={magnetic.style} 
      onMouseMove={magnetic.onMouseMove} 
      onMouseLeave={magnetic.onMouseLeave} 
      className="group/pill flex items-center gap-2.5 px-[15px] py-2.5 rounded-md bg-white/10 backdrop-blur-md border border-white/20 hover:border-white/30 hover:bg-white/15 transition-all cursor-default"
    >
      <div className="w-[30px] h-[30px] rounded-[10px] bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
        <Icon className="w-[15px] h-[15px] text-white" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-xs text-white/60">{desc}</span>
      </div>
    </div>
  );
};
