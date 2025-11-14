import { motion } from 'framer-motion';
import { useState } from 'react';

const Gallery = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Galeria de fotos - Adicione suas imagens em /public/images/gallery/
  const photos = [
    {
      id: 1,
      title: 'Abertura do projeto 2022',
      description: 'Abertura do projeto com a professora Samara, Rafaela, Tatiana e Iracema, os parceiros do Mandiale, das Obras Paroquianas e alunos',
      category: 'Evento',
      image: '/images/gallery/abertura-2022.jpg', // Adicione sua imagem aqui
    },
    {
      id: 2,
      title: 'Formatura 2022',
      description: 'Formatura do projeto Favelaware no Mandiale - 2022',
      category: 'Formatura',
      image: '/images/gallery/formatura-2022.jpg', // Adicione sua imagem aqui
    },
    {
      id: 3,
      title: 'Aula de Programação',
      description: 'Estudantes aprendendo React e JavaScript',
      category: 'Aula',
      image: '/images/gallery/aula-1.jpg', // Adicione sua imagem aqui
    },
    {
      id: 4,
      title: 'Workshop',
      description: 'Workshop de desenvolvimento web',
      category: 'Evento',
      image: '/images/gallery/workshop-1.jpg', // Adicione sua imagem aqui
    },
    {
      id: 5,
      title: 'Apresentação de Projetos',
      description: 'Alunos apresentando seus projetos finais',
      category: 'Projeto',
      image: '/images/gallery/projeto-1.jpg', // Adicione sua imagem aqui
    },
    {
      id: 6,
      title: 'Hackathon',
      description: 'Primeiro hackathon do FavelaWare',
      category: 'Evento',
      image: '/images/gallery/hackathon-1.jpg', // Adicione sua imagem aqui
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section id="galeria" className="relative py-20 bg-gradient-to-br from-white via-gray-50 to-white overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-favela-green-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-favela-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.h2
            className="text-5xl md:text-6xl font-black mb-6"
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-gradient from-favela-green-500 via-favela-blue-500 to-favela-green-500">
              GALERIA
            </span>
          </motion.h2>
          <motion.div
            className="w-24 h-1 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 mx-auto rounded-full"
            initial={{ width: 0 }}
            whileInView={{ width: 96 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
          <motion.p
            className="mt-6 text-xl text-gray-700 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Momentos especiais e conquistas do projeto FavelaWare
          </motion.p>
        </motion.div>

        {/* Gallery Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              variants={itemVariants}
              className="relative group cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              whileHover={{ y: -10 }}
            >
              {/* Card Container */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white border-2 border-gray-200 group-hover:border-favela-green-500 transition-all duration-300 shadow-lg group-hover:shadow-2xl group-hover:shadow-favela-green-500/20">

                {/* Imagem da galeria */}
                {photo.image ? (
                  <img
                    src={photo.image}
                    alt={photo.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      // Se a imagem não carregar, mostra o placeholder
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}

                {/* Placeholder caso a imagem não carregue */}
                <div className="absolute inset-0 bg-gradient-to-br from-favela-green-500/20 via-favela-blue-500/20 to-favela-green-500/20 flex items-center justify-center" style={{ display: photo.image ? 'none' : 'flex' }}>
                  <motion.div
                    className="text-6xl"
                    animate={{
                      rotate: hoveredIndex === index ? 360 : 0,
                    }}
                    transition={{ duration: 0.6 }}
                  >
                    📸
                  </motion.div>
                </div>

                {/* Overlay com informações */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 flex flex-col justify-end"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoveredIndex === index ? 1 : 0.7 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Category Badge */}
                  <motion.span
                    className="inline-block w-fit px-3 py-1 mb-3 text-xs font-bold bg-favela-green-500 text-white rounded-full"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{
                      x: hoveredIndex === index ? 0 : -20,
                      opacity: hoveredIndex === index ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {photo.category}
                  </motion.span>

                  <motion.h3
                    className="text-xl font-bold text-white mb-2"
                    animate={{
                      y: hoveredIndex === index ? 0 : 10,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {photo.title}
                  </motion.h3>

                  <motion.p
                    className="text-sm text-gray-300"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: hoveredIndex === index ? 1 : 0,
                      y: hoveredIndex === index ? 0 : 10,
                    }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    {photo.description}
                  </motion.p>
                </motion.div>

              </div>

              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 rounded-2xl opacity-0 group-hover:opacity-50 blur-xl -z-10 transition-opacity duration-300" />
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <motion.button
            className="group relative px-8 py-4 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 text-white font-bold text-lg rounded-full overflow-hidden shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="relative z-10 flex items-center gap-2">
              Ver Mais Fotos
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default Gallery;
