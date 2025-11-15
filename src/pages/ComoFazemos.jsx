import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const ComoFazemos = () => {

  const trilhas = [
    {
      id: 1,
      titulo: '1ª TRILHA: CULTURA E ENCANTAMENTO',
      horas: '60 HORAS',
      modulos: [
        {
          nome: 'Inclusão: Mundo Digital',
          duracao: '18 horas',
          topicos: [
            'Acessar computador',
            'Onde buscar os recursos',
            'Conceitos de hardware e software',
            'Uso de e-mail e Ferramentas Google'
          ]
        },
        {
          nome: 'Pensamento Lógico',
          duracao: '33 horas',
          topicos: [
            'Introdução ao pensamento lógico',
            'Resolução de problemas de modo geral',
            'Ferramentas que possibilitem o desenvolvimento lógico',
            'Lógica de programação e algoritmos',
            'Correlacionando com Fluxograma',
            'Git e GitHub'
          ]
        }
      ]
    },
    {
      id: 2,
      titulo: '2ª TRILHA: DESENVOLVIMENTO WEB',
      horas: '152 HORAS',
      modulos: [
        {
          nome: 'HTML',
          duracao: '33 horas',
          topicos: [
            'O que é HTML',
            'Cabeçalhos, parágrafos, formatação',
            'Lista ordenada e não ordenada, imagens',
            'Links, formulários',
            'Desenvolvimento do desafio HTML',
            'Exercícios Práticos'
          ]
        },
        {
          nome: 'Introdução Forge Chatbot e IA I',
          duracao: '18 horas',
          topicos: [
            'Introdução ao desenvolvimento de IA em ChatBot',
            'Chatbot Analytics',
            'Introdução a automação e web-crawlers, RPA, Diferença entre automação e automatização',
            'Forge'
          ]
        },
        {
          nome: 'CSS',
          duracao: '36 horas',
          topicos: [
            'Introdução',
            'Seletores, classes, ids, tags',
            'Formatação, posicionamentos',
            'Fontes, bordas, cores',
            'Projeto - Definição e Esboço'
          ]
        },
        {
          nome: 'LÓGICA DE PROGRAMAÇÃO',
          duracao: '25 horas',
          topicos: [
            'Lógica de programação e algoritmos',
            'Correlacionando com Fluxograma (Moqups e Draw.io)',
            'Desenvolvimento do Projeto'
          ]
        },
        {
          nome: 'JAVASCRIPT',
          duracao: '63 horas',
          topicos: [
            'Variáveis, concatenação',
            'Operadores (aritméticos, relacionais, lógico, ternário)',
            'Estrutura Condicional (if-else)',
            'Estrutura Condicional (switch-case)',
            'Array',
            'Estrutura de repetição (while)',
            'Estrutura de repetição (do-while)',
            'Estrutura de repetição (for)',
            'Funções',
            'Classes e objetos',
            'Desenvolvimento do Projeto'
          ]
        },
        {
          nome: 'JAVASCRIPT PARA WEB',
          duracao: '36 horas',
          topicos: [
            'O que é a DOM e Ferramentas de desenvolvedor',
            'Acessando elementos da página',
            'Manipulando valores de input',
            'Trabalhando com estilos via JavaScript',
            'Desenvolvimento do Projeto'
          ]
        },
        {
          nome: 'Trabalhando com APIs',
          duracao: '46 horas',
          topicos: [
            'O que é API',
            'O que é JSON',
            'Como funciona requisições HTTP',
            'Consumindo uma API (GET)',
            'Conhecendo outros métodos',
            'Inserindo dados via API',
            'Banco de Dados',
            'Desenvolvimento do Projeto'
          ]
        }
      ]
    },
    {
      id: 3,
      titulo: '3ª TRILHA: FORGE',
      horas: '36 HORAS',
      modulos: [
        {
          nome: 'Introdução',
          duracao: '4 horas',
          topicos: [
            'Introdução a automação e web-crawlers',
            'RPA',
            'Diferença entre automação e automatização'
          ]
        },
        {
          nome: 'Tutorial Básico de Forge',
          duracao: '6 horas',
          topicos: [
            'Editar blocos de entrada e saída',
            'Blocos de ações básicas'
          ]
        },
        {
          nome: 'Prática',
          duracao: '14 horas',
          topicos: [
            'Desenvolvimento de bot',
            'Desafio Bot Individual'
          ]
        }
      ]
    },
    {
      id: 4,
      titulo: 'INTERVENÇÃO PSICOLÓGICA',
      horas: '15 HORAS',
      modulos: [
        {
          nome: 'Intervenção Psicológica em grupo',
          duracao: '15 horas',
          topicos: []
        }
      ]
    },
    {
      id: 5,
      titulo: 'OFICINAS',
      horas: '15 HORAS',
      modulos: [
        {
          nome: 'Oficina de Currículo e LinkedIn',
          duracao: '3 horas',
          topicos: []
        },
        {
          nome: 'Oficina Softskills: Mentalidade de Crescimento e Autogestão',
          duracao: '3 horas',
          topicos: []
        },
        {
          nome: 'Oficina Softskills',
          duracao: '3 horas',
          topicos: []
        },
        {
          nome: 'Oficina Softskills: Comportamento em Entrevistas e Networking',
          duracao: '3 horas',
          topicos: []
        },
        {
          nome: 'Pitch de Projeto: Como Apresentar Suas Ideias',
          duracao: '3 horas',
          topicos: []
        }
      ]
    }
  ];

  const edicoesAnteriores = [
    { nome: 'TRILHAS - EDIÇÃO I', ano: '2021' },
    { nome: 'TRILHAS - EDIÇÃO II', ano: '2022' }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section id="como-fazemos" className="min-h-screen bg-white">
      {/* Header - integrado com navbar */}
      <motion.div
        className="bg-[#2d2a5f] text-white pt-28 pb-16 mb-12"
        initial={{ opacity: 0, y: -50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-black text-center">
            TRILHA
          </h1>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Trilhas */}
        {trilhas.map((trilha, index) => (
          <motion.div
            key={trilha.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            {/* Header da Trilha */}
            <div className="bg-gradient-to-r from-[#8bc53f] to-[#7ab52f] py-6 px-8 rounded-t-2xl">
              <h2 className="text-2xl md:text-3xl font-black text-[#2d2a5f] text-center">
                {trilha.titulo} - {trilha.horas}
              </h2>
            </div>

            {/* Conteúdo da Trilha */}
            <div className="bg-white border-2 border-gray-200 rounded-b-2xl p-8">
              {trilha.modulos.map((modulo, mIndex) => (
                <div key={mIndex} className="mb-6 last:mb-0">
                  <h3 className="text-lg font-bold text-[#2d2a5f] mb-3">
                    {modulo.nome} - <span className="text-[#8bc53f]">{modulo.duracao}</span>
                  </h3>

                  {modulo.topicos.length > 0 && (
                    <ul className="ml-8 space-y-2">
                      {modulo.topicos.map((topico, tIndex) => (
                        <li
                          key={tIndex}
                          className="text-[#2d2a5f] relative before:content-[''] before:absolute before:left-[-20px] before:top-[10px] before:w-2 before:h-2 before:bg-[#8bc53f] before:rounded-full"
                        >
                          {topico}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Edições Anteriores */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-16"
        >
          <div className="bg-gradient-to-r from-[#8bc53f] to-[#7ab52f] py-6 px-8 rounded-t-2xl">
            <h2 className="text-2xl md:text-3xl font-black text-[#2d2a5f] text-center">
              EDIÇÕES ANTERIORES
            </h2>
          </div>

          <div className="space-y-4 p-8 bg-white border-2 border-gray-200 rounded-b-2xl">
            {edicoesAnteriores.map((edicao, index) => (
              <motion.button
                key={index}
                className="w-full bg-[#8bc53f] hover:bg-[#7ab52f] text-[#2d2a5f] font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-md hover:shadow-xl"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {edicao.nome}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
    <Footer />
    </div>
  );
};

export default ComoFazemos;
