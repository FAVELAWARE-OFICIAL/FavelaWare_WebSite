/**
 * ============================================
 * PÁGINA HALL DA FAMA (EQUIPES ANTERIORES)
 * ============================================
 *
 * Exibe todas as pessoas que já fizeram parte do projeto.
 * Organizado por ano de participação.
 *
 * Funcionalidades:
 * - Lista de equipes por ano (2024, 2023, 2022)
 * - Informações de cada membro (nome, cargo, foto)
 * - Animações ao aparecer na tela
 */

// Importa ferramentas de animação
import { motion } from 'framer-motion';

// Importa componentes reutilizáveis
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const HallDaFama = () => {
  const equipes = [
    {
      ano: '2024',
      membros: [
        { nome: 'Alessandro Ferreira', cargo: 'Coordenador', foto: null },
        { nome: 'Ivan Santos', cargo: 'Coordenador', foto: null },
        { nome: 'Nathalia Mazziero', cargo: 'Comunicação', foto: null },
        { nome: 'Alinne Viegas', cargo: 'Psicóloga', foto: null },
        { nome: 'Jataiza Barboza', cargo: 'Líder Discente', foto: null },
        { nome: 'Pedro Assunção', cargo: 'Produtor Conteúdo', foto: null },
        { nome: 'Lucelho Cristiano', cargo: 'Instrutor Discente', foto: null },
        { nome: 'João Vitor', cargo: 'Instrutor Discente', foto: null },
        { nome: 'Raquel de Matos', cargo: 'Instrutor Discente', foto: null },
        { nome: 'Matheus Henrique', cargo: 'Instrutor Discente', foto: null },
        { nome: 'Rodrigo Queiroz', cargo: 'Instrutor Discente', foto: null }
      ]
    },
    {
      ano: '2023',
      membros: [
        { nome: 'Alessandro Ferreira', cargo: 'Coordenador', foto: null },
        { nome: 'Ivan Santos', cargo: 'Coordenador', foto: null },
        { nome: 'Alvaro', cargo: 'Coordenador', foto: null },
        { nome: 'Fernanda Alves', cargo: 'Produtora Conteúdo', foto: null },
        { nome: 'Nathalia Mazziero', cargo: 'Comunicação', foto: null },
        { nome: 'Andressa Fernandes', cargo: 'Redes Sociais', foto: null },
        { nome: 'Alinne Viegas', cargo: 'Psicóloga', foto: null },
        { nome: 'Taynara Soares', cargo: 'Intervenção Psicológica', foto: null },
        { nome: 'Scarlett Lima', cargo: 'Intervenção Psicológica', foto: null },
        { nome: 'Ludmila dos Santos', cargo: 'Intervenção Psicológica', foto: null },
        { nome: 'Laís Martins', cargo: 'Intervenção Psicológica', foto: null },
        { nome: 'Fabíola Fernanda', cargo: 'Orientadora Psicologia', foto: null },
        { nome: 'Jataiza Barboza', cargo: 'Líder Discente', foto: null },
        { nome: 'Lucelho Cristiano', cargo: 'Instrutor Discente', foto: null },
        { nome: 'João Vitor', cargo: 'Instrutor Discente', foto: null },
        { nome: 'Raquel de Matos', cargo: 'Instrutor Discente', foto: null },
        { nome: 'Matheus Henrique', cargo: 'Instrutor Discente', foto: null },
        { nome: 'Gabriel Lucas', cargo: 'Instrutor Discente', foto: null }
      ]
    },
    {
      ano: '2022',
      membros: [
        { nome: 'Karla', cargo: 'Sponsor', foto: null },
        { nome: 'Laura Magalhães', cargo: 'Cellider', foto: null },
        { nome: 'Paulo Henrique Domingos', cargo: 'Edição', foto: null },
        { nome: 'Marcelo Laurentino', cargo: 'Curadoria de Material', foto: null },
        { nome: 'Lara Alves', cargo: 'Líder Discente', foto: null },
        { nome: 'Fabiana Quelott', cargo: 'Instrutor Discente', foto: null },
        { nome: 'Jamir Rodrigues', cargo: 'Instrutor Discente', foto: null },
        { nome: 'Thalita Alves', cargo: 'Instrutor Discente', foto: null },
        { nome: 'Lucelho Cristiano', cargo: 'Instrutor Discente', foto: null },
        { nome: 'Emily Lamas', cargo: 'Instrutor Discente', foto: null }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-[#2d2a5f] text-white pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h1
            className="text-4xl md:text-5xl font-black text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            QUEM JÁ PASSOU POR AQUI...
          </motion.h1>
        </div>
      </section>

      {/* Equipes por ano */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          {equipes.map((equipe, equipeIndex) => (
            <motion.div
              key={equipe.ano}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: equipeIndex * 0.2 }}
            >
              <h2 className="text-4xl font-black text-[#2d2a5f] text-center mb-12">
                EM {equipe.ano}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                {equipe.membros.map((membro, membroIndex) => (
                  <motion.div
                    key={membroIndex}
                    className="flex flex-col items-center text-center group"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: membroIndex * 0.05 }}
                    whileHover={{ y: -10, transition: { duration: 0.3 } }}
                  >
                    {/* Avatar */}
                    <motion.div
                      className="relative w-28 h-28 bg-[#8bc53f] rounded-full mb-4 overflow-hidden"
                      whileHover={{
                        boxShadow: '0 0 30px rgba(139, 197, 63, 0.6)',
                        scale: 1.1
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {membro.foto ? (
                        <img
                          src={membro.foto}
                          alt={membro.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg
                            className="w-16 h-16 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Brilho ao hover */}
                      <motion.div
                        className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20"
                        transition={{ duration: 0.3 }}
                      />
                    </motion.div>

                    {/* Info */}
                    <p className="text-sm font-bold text-[#8bc53f] mb-1">{membro.cargo}</p>
                    <p className="text-base font-bold text-[#2d2a5f]">{membro.nome}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HallDaFama;
