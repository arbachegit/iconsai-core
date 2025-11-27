const TuringLegacy = () => {
  return (
    <section className="py-10 relative">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent">
          O Legado de Turing
        </h2>
        
        <blockquote className="max-w-4xl mx-auto">
          <p className="text-2xl md:text-3xl italic bg-gradient-to-r from-cyan-400 via-green-400 to-yellow-400 bg-clip-text text-transparent leading-relaxed">
            "Alan Turing não apenas imaginou máquinas que pensam — ele construiu as fundações teóricas para que um dia pudéssemos conversar com elas. O que começou como um teste filosófico tornou-se a realidade que vivemos hoje: a era da comunicação natural entre humanos e inteligência artificial."
          </p>
          <footer className="mt-6 text-lg text-muted-foreground">
            by Fernando Arbache
          </footer>
        </blockquote>
      </div>
    </section>
  );
};

export default TuringLegacy;
