/**
 * ============================================
 * PÁGINA SOBRE (INFORMAÇÕES DO PROJETO)
 * ============================================
 *
 * Página com informações detalhadas sobre o projeto FavelaWare.
 *
 * Seções:
 * - Sobre o projeto (missão e descrição)
 * - Cronograma macro (timeline de eventos)
 * - Idealizadores (equipe fundadora)
 * - Propósitos (acadêmico, social, carreira)
 * - Informações sobre cada parceiro
 */

// Importa ferramentas de animação e navegação
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

// Importa componentes reutilizáveis
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Sobre = () => {
  const cronogramaItems = [
    {
      data: '29/05',
      titulo: 'Início das divulgações',
      subtitulo: '26/05',
      subtituloTexto: 'Pré-inscrições para as oficinas',
      posicao: 0
    },
    {
      data: '18/06',
      titulo: 'Oficina Mundo Tech',
      subtitulo: '11/06',
      subtituloTexto: 'Oficina Developer na Prática',
      posicao: 1
    },
    {
      data: '25/06',
      titulo: 'Oficina ChatBot e IA',
      subtitulo: '25/06',
      subtituloTexto: 'Inscrições FavelaWare',
      posicao: 2
    },
    {
      data: '05/08',
      titulo: 'Início das aulas',
      subtitulo: '',
      subtituloTexto: '',
      posicao: 3
    },
    {
      data: '01/08/26',
      titulo: 'Formatura',
      subtitulo: '',
      subtituloTexto: '',
      posicao: 4
    }
  ];

  const idealizadores = [
    { nome: 'Gustavo Pena', cargo: 'Idealizador', organizacao: 'Mundiale', foto: '/imgs/team/gustavo.jpg' },
    { nome: 'Cristiane de Ávila', cargo: 'Idealizadora', organizacao: 'Mundiale', foto: '/imgs/team/cristiane.jpg' },
    { nome: 'Diomar', cargo: 'Idealizador', organizacao: 'AOPA', foto: '/imgs/team/diomar.jpg' },
    { nome: 'Rafaela Moreira', cargo: 'Idealizadora e Orientadora', organizacao: 'Ânima', foto: '/imgs/team/rafaela.jpg' },
    { nome: 'Samara Leal', cargo: 'Idealizadora', organizacao: 'Ânima', foto: '/imgs/team/samara.jpg' }
  ];

  const propositos = [
    {
      titulo: 'Acadêmico',
      descricao: 'Proporcionar aos alunos de TI da Una Cristiano Machado compartilhar as habilidades adquiridas nos cursos.',
      cor: 'text-pink-500'
    },
    {
      titulo: 'Social',
      descricao: 'Gerar mudanças na realidade de jovens de comunidades vulneráveis.',
      cor: 'text-pink-500'
    },
    {
      titulo: 'Carreira',
      descricao: 'Fornecer experiência prática, abrindo um novo caminho para o futuro da carreira de tecnologia.',
      cor: 'text-pink-500'
    }
  ];

  const parceiros = [
    {
      nome: 'Mundiale',
      descricao: 'Com a união de pessoas, tecnologia e uma metodologia própria, a Mundiale revoluciona a relação entre marcas e consumidores por meio de canais digitais, proporcionando interações mais humanas, assertivas e fluidas.',
      logo: '/imgs/partners/Mundiale.png',
      link: 'https://mundiale.com.br'
    },
    {
      nome: 'AOPA',
      descricao: 'A AOPA é uma instituição social católica dos Religiosos Pavonianos, que, pela experiência de seu fundador, São Ludovico Pavoni, dedica-se ao atendimento integral de crianças e adolescentes.',
      logo: '/imgs/partners/AOPA.png',
      link: 'https://aopa.org.br'
    },
    {
      nome: 'Ecossistema Ânima Educação',
      descricao: 'O Ecossistema Ânima Educação é uma das maiores organizações educacionais privadas de ensino superior do Brasil, com cerca de 330 mil estudantes e 18 mil educadores e educadoras.',
      logo: '/imgs/partners/ecossistema ânima.png',
      link: 'https://animaeducacao.com.br'
    },
    {
      nome: 'Una Cristiano Machado',
      descricao: 'A Una Cristiano Machado é uma das instituições da Ânima com compromisso de oferecer educação de qualidade, focada na formação acadêmica sólida e inovadora.',
      logo: '/imgs/partners/Una Cristiano Machado.png',
      link: 'https://una.br'
    },
    {
      nome: 'REDE TRANSFORMAR',
      descricao: 'A REDE TRANSFORMAR é uma organização sem fins lucrativos que desenvolve programas, projetos e ações de assessoramento, defesa e garantia de direitos sociais.',
      logo: '/imgs/partners/Rede Transformar.jpg',
      link: 'https://redetransformar.org.br'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-[#2d2a5f] text-white pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h1
            className="text-4xl md:text-5xl font-black text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            SOBRE O PROJETO
          </motion.h1>
        </div>
      </section>

      {/* Sobre o FavelaWare */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="space-y-6 text-gray-700 text-lg leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p>
              O <span className="font-bold text-pink-500">FavelaWare</span> é uma iniciativa voltada para a{' '}
              <span className="font-bold text-[#8bc53f]">formação de jovens programadores</span>, de 15 a 24 anos, vindos dos aglomerados Barragem Santa Lúcia, Morro do Papagaio, Vila São José, Conjunto Santa Maria, Vila Leonina, Vila Estrela, Morro das Pedras e região, em Belo Horizonte/MG.
            </p>
            <p>
              O projeto é focado na formação técnica (com aulas de lógica básica, low code, back end e front end) e na formação de soft skills (comunicação, desenvolvimento pessoal, trabalho em equipe etc.), com{' '}
              <span className="font-bold text-[#8bc53f]">aulas ministradas por especialistas</span> na área.
            </p>
            <p>
              O <span className="font-bold text-pink-500">FavelaWare</span> é uma iniciativa da{' '}
              <span className="font-bold text-[#8bc53f]">Mundiale</span>, do{' '}
              <span className="font-bold text-pink-500">Ecossistema Ânima Educação</span> através da{' '}
              <span className="font-bold text-[#8bc53f]">UNA Cristiano Machado</span> e das{' '}
              <span className="font-bold text-pink-500">Obras Pavonianas</span> com a{' '}
              <span className="font-bold text-[#8bc53f]">Rede Transformar</span>.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Cronograma */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            className="text-3xl md:text-4xl font-black text-[#2d2a5f] text-center mb-16"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            CRONOGRAMAS — EDIÇÃO III
          </motion.h2>

          <div className="mb-12 relative bg-white p-8 rounded-2xl shadow-md">
            {/* Ícone no canto */}
            <div className="absolute left-8 top-8 flex items-start gap-1">
              <div className="w-2 h-2 bg-[#8bc53f] rounded-sm"></div>
              <div className="w-4 h-4 bg-[#2d2a5f] rounded-sm"></div>
            </div>

            <h3 className="text-2xl font-bold text-[#2d2a5f] mb-20 italic text-center">Cronograma Macro</h3>

            {/* Timeline Container */}
            <div className="relative py-40">
              {/* Linha horizontal AZUL/ROXA */}
              <div className="absolute top-1/2 left-0 right-0 h-2 bg-[#2d2a5f] transform -translate-y-1/2 rounded-full" />

              {/* Items do cronograma */}
              <div className="relative grid grid-cols-5 gap-2">
                {cronogramaItems.map((item, index) => (
                  <div key={index} className="relative flex flex-col items-center">
                    {/* Linha vertical superior VERDE */}
                    <div className="absolute top-1/2 left-1/2 w-1 h-28 bg-[#8bc53f] transform -translate-x-1/2 -translate-y-full"></div>

                    {/* Bola BRANCA com borda VERDE no topo - SÓ DATA */}
                    <motion.div
                      className="absolute top-1/2 left-1/2 w-6 h-6 border-3 border-[#8bc53f] bg-white rounded-full transform -translate-x-1/2 shadow-md z-20"
                      style={{ top: 'calc(50% - 128px)' }}
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{
                        scale: 1.5,
                        boxShadow: '0 0 30px rgba(139, 197, 63, 0.8)'
                      }}
                    />

                    {/* Data acima da bola branca */}
                    <motion.p
                      className="absolute left-1/2 transform -translate-x-1/2 text-xs font-bold text-[#2d2a5f]"
                      style={{ top: 'calc(50% - 152px)' }}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {item.data}
                    </motion.p>

                    {/* Texto do evento acima da data */}
                    <motion.p
                      className="absolute left-1/2 transform -translate-x-1/2 text-xs text-center text-gray-600 max-w-[110px] leading-snug"
                      style={{ top: 'calc(50% - 195px)' }}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 + 0.1 }}
                    >
                      {item.titulo}
                    </motion.p>

                    {/* Bola VERDE na linha azul - COM TEXTO */}
                    <motion.div
                      className="absolute top-1/2 left-1/2 w-10 h-10 bg-[#8bc53f] rounded-full z-10 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 shadow-xl"
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.15, type: 'spring', stiffness: 200 }}
                      whileHover={{
                        scale: 1.7,
                        boxShadow: '0 0 45px rgba(139, 197, 63, 1)',
                        transition: { duration: 0.3 }
                      }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {/* Brilho interno gradiente */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-transparent to-transparent" />
                    </motion.div>

                    {/* Conteúdo inferior (quando existir) */}
                    {item.subtitulo && (
                      <>
                        {/* Linha vertical inferior VERDE */}
                        <div className="absolute top-1/2 left-1/2 w-1 h-28 bg-[#8bc53f] transform -translate-x-1/2"></div>

                        {/* Bola BRANCA com borda VERDE embaixo - SÓ DATA */}
                        <motion.div
                          className="absolute top-1/2 left-1/2 w-6 h-6 border-3 border-[#8bc53f] bg-white rounded-full transform -translate-x-1/2 shadow-md z-20"
                          style={{ top: 'calc(50% + 128px)' }}
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.1 + 0.2 }}
                          whileHover={{
                            scale: 1.5,
                            boxShadow: '0 0 30px rgba(139, 197, 63, 0.8)'
                          }}
                        />

                        {/* Texto do evento embaixo */}
                        <motion.p
                          className="absolute left-1/2 transform -translate-x-1/2 text-xs text-center text-gray-600 max-w-[110px] leading-snug"
                          style={{ top: 'calc(50% + 148px)' }}
                          initial={{ opacity: 0, y: -10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.1 + 0.2 }}
                        >
                          {item.subtituloTexto}
                        </motion.p>

                        {/* Data abaixo do texto embaixo */}
                        <motion.p
                          className="absolute left-1/2 transform -translate-x-1/2 text-xs font-bold text-[#2d2a5f] whitespace-nowrap"
                          style={{ top: 'calc(50% + 190px)' }}
                          initial={{ opacity: 0, y: -10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.1 + 0.3 }}
                        >
                          {item.subtitulo}
                        </motion.p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Idealizadores */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            className="text-3xl md:text-4xl font-black text-[#2d2a5f] text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            IDEALIZADORES
          </motion.h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {idealizadores.map((pessoa, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10 }}
              >
                <div className="w-32 h-32 bg-[#8bc53f] rounded-full mb-4 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-[#8bc53f] to-[#7ab52f]" />
                </div>
                <p className="text-sm font-bold text-[#8bc53f] mb-1">{pessoa.cargo}</p>
                <p className="text-base font-bold text-[#2d2a5f]">{pessoa.nome}</p>
                <p className="text-sm text-pink-500 font-semibold">{pessoa.organizacao}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Propósitos */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            className="text-3xl md:text-4xl font-black text-[#2d2a5f] text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            PROPÓSITOS
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {propositos.map((proposito, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
              >
                <h3 className={`text-xl font-bold ${proposito.cor} mb-4`}>{proposito.titulo}</h3>
                <p className="text-gray-700">{proposito.descricao}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sobre cada Parceiro */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            className="text-3xl md:text-4xl font-black text-[#2d2a5f] text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            SOBRE CADA PARCEIRO
          </motion.h2>

          <div className="space-y-12">
            {parceiros.map((parceiro, index) => (
              <motion.div
                key={index}
                className="flex flex-col md:flex-row items-center gap-8 bg-gray-50 p-8 rounded-2xl"
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="w-48 h-48 flex items-center justify-center">
                  <img src={parceiro.logo} alt={parceiro.nome} className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-700 mb-6">{parceiro.descricao}</p>
                  <motion.a
                    href={parceiro.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-white border-2 border-[#2d2a5f] text-[#2d2a5f] font-bold rounded-lg transition-all duration-300"
                    whileHover={{
                      backgroundColor: '#2d2a5f',
                      color: '#ffffff',
                      scale: 1.05
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    SAIBA MAIS
                  </motion.a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Hall da Fama Button */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link to="/hall-da-fama">
            <motion.button
              className="px-12 py-6 bg-[#2d2a5f] text-white font-black text-xl rounded-full shadow-2xl"
              whileHover={{
                scale: 1.1,
                boxShadow: '0 20px 60px rgba(45, 42, 95, 0.4)'
              }}
              whileTap={{ scale: 0.95 }}
            >
              HALL DA FAMA (EQUIPE)
            </motion.button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Sobre;
