const TuringLegacy = () => {
  return (
    <section className="py-10 relative">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent">
          O Legado de Turing
        </h2>
        
        <blockquote className="max-w-4xl mx-auto">
          <p className="text-2xl md:text-3xl italic bg-gradient-to-r from-cyan-400 via-green-400 to-yellow-400 bg-clip-text text-transparent leading-relaxed">
            "Muito antes de falarmos com computadores, ele ousou perguntar se eles poderiam pensar. Decifrar o Enigma venceu a guerra, mas o 'Jogo da Imitação' venceu o tempo."
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
