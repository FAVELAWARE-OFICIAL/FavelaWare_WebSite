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
import { MotionLink } from '../components/MotionLink';
import { equipeEdicaoIII } from '../data/hallDaFama';
import { LinkLinkedin } from '../components/RedesSociais';

const Sobre = () => {
  // Ordem cronológica, da esquerda para a direita, como no cronograma do site
  // oficial: lá cada texto fica alinhado com a data do mesmo ponto da linha.
  const cronogramaItems = [
    { data: '26/05', titulo: 'Início das divulgações' },
    { data: '29/05', titulo: 'Pré-inscrições para as oficinas' },
    { data: '11/06', titulo: 'Oficina Mundo Tech' },
    { data: '18/06', titulo: 'Oficina Developer na Prática' },
    { data: '25/06', titulo: 'Oficina ChatBot e IA' },
    { data: '25/06', titulo: 'Inscrições FavelaWare' },
    { data: '05/08', titulo: 'Início das aulas' },
    { data: '01/08/26', titulo: 'Formatura' },
  ];

  const idealizadores = [
    { nome: 'Gustavo Pena', cargo: 'Idealizador', organizacao: 'Mundiale', foto: '/imgs/team/gustavo.webp' },
    { nome: 'Cristiane de Ávila', cargo: 'Idealizadora', organizacao: 'Mundiale', foto: '/imgs/team/cristiane.webp' },
    { nome: 'Diomar', cargo: 'Idealizador', organizacao: 'AOPA', foto: '/imgs/team/diomar.webp' },
    { nome: 'Rafaela Moreira', cargo: 'Idealizadora e Orientadora', organizacao: 'Ânima', foto: '/imgs/team/rafaela.webp', linkedin: 'https://www.linkedin.com/in/rafaelapcmoreira/' },
    { nome: 'Samara Leal', cargo: 'Idealizadora', organizacao: 'Ânima', foto: '/imgs/team/samara.webp' }
  ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); // sempre em ordem alfabética

  // A equipe da 3ª edição (equipeEdicaoIII) mora em src/data/hallDaFama.ts:
  // a mesma lista abastece esta página e a 3ª edição do hall.

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

  // link é opcional: parceiro sem site oficial conhecido fica sem o botão "SAIBA MAIS"
  const parceiros: { nome: string; descricao: string; logo: string; link?: string }[] = [
    {
      nome: 'Mundiale',
      descricao: 'Com a união de pessoas, tecnologia e uma metodologia própria, a Mundiale revoluciona a relação entre marcas e consumidores por meio de canais digitais, proporcionando interações mais humanas, assertivas e fluidas.',
      logo: '/imgs/partners/Mundiale.webp',
      link: 'https://mundiale.com.br'
    },
    {
      nome: 'AOPA',
      descricao: 'A AOPA é uma instituição social católica dos Religiosos Pavonianos, que, pela experiência de seu fundador, São Ludovico Pavoni, dedica-se ao atendimento integral de crianças e adolescentes.',
      logo: '/imgs/partners/AOPA.webp',
      link: 'https://www.pavonianos.org.br/unidade/aopabh'
    },
    {
      nome: 'Ecossistema Ânima Educação',
      descricao: 'O Ecossistema Ânima Educação é uma das maiores organizações educacionais privadas de ensino superior do Brasil, com cerca de 330 mil estudantes e 18 mil educadores e educadoras.',
      logo: '/imgs/partners/ecossistema ânima.webp',
      link: 'https://animaeducacao.com.br'
    },
    {
      nome: 'Una Cristiano Machado',
      descricao: 'A Una Cristiano Machado é uma das instituições da Ânima com compromisso de oferecer educação de qualidade, focada na formação acadêmica sólida e inovadora.',
      logo: '/imgs/partners/Una Cristiano Machado.webp',
      link: 'https://una.br'
    },
    {
      // O site oficial não traz descrição do Ânima Lab (só o rodapé "Site criado
      // pela equipe Ânima Hub"): texto provisório, a confirmar com a coordenação
      nome: 'Ânima Lab',
      descricao: 'O Ânima Lab faz parte do Ecossistema Ânima Educação. A equipe Ânima Hub criou o site oficial do FavelaWare.',
      logo: '/imgs/partners/ânima.webp'
    },
    {
      nome: 'REDE TRANSFORMAR',
      descricao: 'A REDE TRANSFORMAR é uma organização sem fins lucrativos que desenvolve programas, projetos e ações de assessoramento, defesa e garantia de direitos sociais.',
      logo: '/imgs/partners/Rede Transformar.webp'
    }
  ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })); // sempre em ordem alfabética

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-[#2d2a5f] text-white pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-center mb-8"
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
            {/* Quadradinhos do canto, como no original: o verde encosta na quina do roxo */}
            <div className="absolute left-8 top-8 flex items-start" aria-hidden="true">
              <div className="w-2.5 h-2.5 bg-[#8bc53f]" />
              <div className="w-7 h-7 mt-2.5 bg-[#2d2a5f]" />
            </div>

            {/* mt-12 no celular: em tela estreita o título centralizado encostava nos quadradinhos */}
            <h3 className="mt-12 md:mt-0 text-2xl font-bold text-[#2d2a5f] mb-10 italic text-center">Cronograma Macro</h3>

            {/* Linha do tempo (tablet e computador), no desenho do site oficial:
                bola verde na linha, texto de um lado e data do outro, alternando.
                Tudo em fluxo normal, sem posição absoluta por ponto: antes o
                transform das animações anulava o -translate do Tailwind e
                desalinhava bolas e hastes.
                No celular os textos não cabem lado a lado: lá aparece a lista abaixo. */}
            <motion.div
              className="relative hidden md:block max-w-5xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {/* Linha roxa: do centro da primeira bola ao centro da última (metade do w-20) */}
              <div className="absolute top-1/2 left-10 right-10 h-1.5 -translate-y-1/2 bg-[#2d2a5f] rounded-full" aria-hidden="true" />

              <ol className="relative flex">
                {cronogramaItems.map((item, index) => {
                  // Alterna os lados: nos pontos pares o texto fica em cima e a data embaixo
                  const textoEmCima = index % 2 === 0;
                  const haste = <span className="w-[3px] h-7 bg-[#8bc53f]" aria-hidden="true" />;
                  const bolinha = <span className="w-5 h-5 rounded-full border-2 border-[#8bc53f] bg-white" aria-hidden="true" />;

                  return (
                    <li
                      key={item.titulo}
                      // A formatura fica isolada na ponta, como no original: é no ano seguinte
                      className={`w-20 shrink-0 flex flex-col items-center text-center ${index === cronogramaItems.length - 1 ? 'ml-auto' : ''}`}
                    >
                      {/* Metade de cima: o conteúdo encosta na bola verde */}
                      <div className="h-20 flex flex-col items-center justify-end">
                        {textoEmCima ? (
                          <p className="w-24 mb-2 text-xs leading-snug text-[#2d2a5f]">{item.titulo}</p>
                        ) : (
                          <>
                            <p className="mb-1 text-xs font-bold text-[#2d2a5f]">{item.data}</p>
                            {bolinha}
                            {haste}
                          </>
                        )}
                      </div>

                      {/* Bola verde sobre a linha */}
                      <span className="w-7 h-7 rounded-full bg-[#8bc53f]" aria-hidden="true" />

                      {/* Metade de baixo */}
                      <div className="h-20 flex flex-col items-center justify-start">
                        {textoEmCima ? (
                          <>
                            {haste}
                            {bolinha}
                            <p className="mt-1 text-xs font-bold text-[#2d2a5f]">{item.data}</p>
                          </>
                        ) : (
                          <p className="w-24 mt-2 text-xs leading-snug text-[#2d2a5f]">{item.titulo}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </motion.div>

            {/* Versão vertical do cronograma (celular): mesmos itens e cores,
                com a linha roxa na esquerda e as bolas sobre ela */}
            <ol className="md:hidden relative ml-3 border-l-4 border-[#2d2a5f] space-y-8">
              {cronogramaItems.map((item) => (
                <li key={item.titulo} className="relative pl-8">
                  {/* Bola VERDE na linha */}
                  <span className="absolute -left-[14px] top-0 w-6 h-6 bg-[#8bc53f] rounded-full shadow-md" aria-hidden="true" />
                  <p className="text-sm font-bold text-[#2d2a5f]">{item.data}</p>
                  <p className="text-gray-600">{item.titulo}</p>
                </li>
              ))}
            </ol>
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
                {/* Foto da pessoa. O verde do container aparece nas bordas do
                    recorte circular, então combina com o fundo verde da própria foto. */}
                <div className="w-32 h-32 bg-[#8bc53f] rounded-full mb-4 overflow-hidden">
                  <img
                    src={pessoa.foto}
                    alt={`Foto de ${pessoa.nome}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm font-bold text-[#8bc53f] mb-1">{pessoa.cargo}</p>
                <p className="text-base font-bold text-[#2d2a5f]">{pessoa.nome}</p>
                <p className="text-sm text-pink-500 font-semibold">{pessoa.organizacao}</p>
                {pessoa.linkedin && <LinkLinkedin nome={pessoa.nome} url={pessoa.linkedin} />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipe da edição atual */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            className="text-3xl md:text-4xl font-black text-[#2d2a5f] text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            EQUIPE — EDIÇÃO III
          </motion.h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8">
            {equipeEdicaoIII.map((pessoa, index) => (
              <motion.div
                key={pessoa.nome}
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: (index % 5) * 0.1 }}
                whileHover={{ y: -10 }}
              >
                <div className="w-32 h-32 bg-[#8bc53f] rounded-full mb-4 overflow-hidden shadow-lg ring-4 ring-white">
                  <img
                    src={pessoa.foto}
                    alt={`Foto de ${pessoa.nome}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm font-bold text-[#8bc53f] mb-1">{pessoa.cargo}</p>
                <p className="text-base font-bold text-[#2d2a5f]">{pessoa.nome}</p>
                <p className="text-sm text-pink-500 font-semibold">{pessoa.organizacao}</p>
                {pessoa.linkedin && <LinkLinkedin nome={pessoa.nome} url={pessoa.linkedin} />}
              </motion.div>
            ))}
          </div>

          {/* Atalho para as equipes anteriores */}
          <div className="text-center mt-12">
            <Link
              to="/hall-da-fama"
              className="inline-block bg-[#8bc53f] hover:bg-[#7ab52f] text-[#2d2a5f] font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-md hover:shadow-xl"
            >
              VER AS EQUIPES ANTERIORES
            </Link>
          </div>
        </div>
      </section>

      {/* Propositos */}
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

      {/* Sobre cada Parceiro.
          overflow-x-hidden: os cards entram deslizando de fora (x ±50) e,
          no celular, isso criava rolagem lateral na página. */}
      <section className="py-16 bg-white overflow-x-hidden">
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
                  <img src={parceiro.logo} alt={parceiro.nome} loading="lazy" decoding="async" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-700 mb-6">{parceiro.descricao}</p>
                  {parceiro.link && (
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
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Hall da Fama Button */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* inline-block: o link ocupa a mesma caixa que o antigo <button> ocupava */}
          <MotionLink
            to="/hall-da-fama"
            className="inline-block px-12 py-6 bg-[#2d2a5f] text-white font-black text-xl rounded-full shadow-2xl"
            whileHover={{
              scale: 1.1,
              boxShadow: '0 20px 60px rgba(45, 42, 95, 0.4)'
            }}
            whileTap={{ scale: 0.95 }}
          >
            HALL DA FAMA (EQUIPE)
          </MotionLink>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Sobre;
