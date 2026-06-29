const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f] flex items-center justify-center font-body">
      <div className="pointer-events-none absolute -top-1/4 -left-1/4 h-[60vw] w-[60vw] rounded-full bg-[#ff3d81] opacity-30 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-1/4 -right-1/4 h-[55vw] w-[55vw] rounded-full bg-[#5b2bff] opacity-30 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-[35vw] w-[35vw] rounded-full bg-[#00e0c6] opacity-20 blur-[110px]" />

      <div className="relative z-10 px-6 text-center">
        <p className="mb-6 font-body text-sm uppercase tracking-[0.5em] text-white/50">
          Добро пожаловать
        </p>
        <h1 className="font-display text-[22vw] font-900 leading-none text-transparent bg-clip-text bg-gradient-to-r from-[#ff3d81] via-[#a855f7] to-[#00e0c6] md:text-[15vw]">
          щшоп
        </h1>
        <div className="mx-auto mt-8 h-px w-24 bg-white/20" />
        <p className="mx-auto mt-8 max-w-md font-body text-base text-white/40">
          Первая версия страницы готова
        </p>
      </div>
    </div>
  );
};

export default Index;
