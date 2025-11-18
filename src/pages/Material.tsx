/**
 * ============================================
 * PÁGINA MATERIAL (MATERIAIS E ENTREGAS)
 * ============================================
 *
 * Esta página permite aos alunos:
 * 1. Acessar materiais educacionais (Google Drive, Gitbook)
 * 2. Fazer upload de atividades em PDF
 *
 * Componentes principais:
 * - Seção de materiais disponíveis para download
 * - Formulário de entrega de atividades
 *
 * Conceitos importantes:
 * - useState: gerencia o estado do formulário
 * - FormData: para lidar com upload de arquivos
 * - Validação de formulário: garante que todos campos estão preenchidos
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import type { Material } from '../types';

/**
 * COMPONENTE MATERIAL
 * Página completa com materiais e sistema de entrega
 */
const Material: React.FC = () => {
  // ============================================
  // ESTADOS DO COMPONENTE
  // ============================================

  // Estado do formulário de entrega
  const [formData, setFormData] = useState({
    nomeAluno: '',
    emailAluno: '',
    nomeAtividade: '',
    arquivo: null as File | null,
  });

  // Estado de mensagem de feedback para o usuário
  const [mensagem, setMensagem] = useState<{
    tipo: 'sucesso' | 'erro' | '';
    texto: string;
  }>({ tipo: '', texto: '' });

  // Estado de carregamento (para mostrar ao enviar)
  const [enviando, setEnviando] = useState(false);

  // ============================================
  // DADOS DOS MATERIAIS DISPONÍVEIS
  // ============================================

  const materiais: Material[] = [
    {
      id: 1,
      titulo: 'FavelaWare - 3ª Edição',
      descricao: 'Materiais completos da terceira edição do curso',
      plataforma: 'drive',
      link: '#', // Substituir pelo link real do Google Drive
      icone: '📁',
    },
    {
      id: 2,
      titulo: 'Documentação GitBook',
      descricao: 'Documentação técnica e tutoriais interativos',
      plataforma: 'gitbook',
      link: '#', // Substituir pelo link real do GitBook
      icone: '📚',
    },
  ];

  // ============================================
  // FUNÇÕES DE MANIPULAÇÃO DO FORMULÁRIO
  // ============================================

  /**
   * Atualiza os campos de texto do formulário
   * Usa event.target para pegar o nome e valor do input
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Lida com o upload do arquivo PDF
   * Valida se o arquivo é PDF antes de aceitar
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      // Validação: apenas PDFs são aceitos
      if (file.type !== 'application/pdf') {
        setMensagem({
          tipo: 'erro',
          texto: '⚠️ Por favor, envie apenas arquivos PDF!',
        });
        e.target.value = ''; // Limpa o input
        return;
      }

      // Validação: limite de 10MB
      const maxSize = 10 * 1024 * 1024; // 10MB em bytes
      if (file.size > maxSize) {
        setMensagem({
          tipo: 'erro',
          texto: '⚠️ O arquivo deve ter no máximo 10MB!',
        });
        e.target.value = ''; // Limpa o input
        return;
      }

      setFormData(prev => ({
        ...prev,
        arquivo: file,
      }));
      setMensagem({ tipo: '', texto: '' }); // Limpa mensagens de erro
    }
  };

  /**
   * Envia o formulário
   * Aqui você pode integrar com um backend ou serviço de armazenamento
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Previne recarregar a página

    // Validação: verifica se todos os campos estão preenchidos
    if (!formData.nomeAluno || !formData.emailAluno || !formData.nomeAtividade || !formData.arquivo) {
      setMensagem({
        tipo: 'erro',
        texto: '⚠️ Por favor, preencha todos os campos!',
      });
      return;
    }

    setEnviando(true);

    try {
      // TODO: INTEGRAÇÃO COM BACKEND
      // Aqui você pode enviar para um servidor, Google Drive API, etc.
      // Exemplo de FormData para envio:

      const formDataToSend = new FormData();
      formDataToSend.append('nomeAluno', formData.nomeAluno);
      formDataToSend.append('emailAluno', formData.emailAluno);
      formDataToSend.append('nomeAtividade', formData.nomeAtividade);
      formDataToSend.append('arquivo', formData.arquivo);
      formDataToSend.append('dataEntrega', new Date().toISOString());

      // Simulação de envio (remover quando integrar com backend)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Por enquanto, apenas mostra mensagem de sucesso
      setMensagem({
        tipo: 'sucesso',
        texto: '✅ Atividade enviada com sucesso! Você receberá um email de confirmação.',
      });

      // Limpa o formulário
      setFormData({
        nomeAluno: '',
        emailAluno: '',
        nomeAtividade: '',
        arquivo: null,
      });

      // Limpa o input de arquivo manualmente
      const fileInput = document.getElementById('arquivo') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      setMensagem({
        tipo: 'erro',
        texto: '❌ Erro ao enviar atividade. Tente novamente mais tarde.',
      });
      console.error('Erro ao enviar:', error);
    } finally {
      setEnviando(false);
    }
  };

  // ============================================
  // ANIMAÇÕES
  // ============================================

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  // ============================================
  // RENDERIZAÇÃO DO COMPONENTE
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      {/* Header da Página */}
      <div className="bg-[#2d2a5f] pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              MATERIAIS
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Acesse os materiais do curso e envie suas atividades
            </p>
          </motion.div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ============================================
            SEÇÃO 1: MATERIAIS DISPONÍVEIS
            ============================================ */}
        <motion.section
          {...fadeInUp}
          className="mb-20"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            📚 Materiais Disponíveis
          </h2>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
          >
            {materiais.map((material) => (
              <motion.a
                key={material.id}
                href={material.link}
                target="_blank"
                rel="noopener noreferrer"
                variants={fadeInUp}
                whileHover={{ scale: 1.03, y: -5 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-xl shadow-lg p-6 border-2 border-transparent hover:border-favela-green-500 transition-all duration-300"
              >
                <div className="flex items-start space-x-4">
                  <div className="text-5xl">{material.icone}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {material.titulo}
                    </h3>
                    <p className="text-gray-600 mb-3">
                      {material.descricao}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        material.plataforma === 'drive'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {material.plataforma === 'drive' ? 'Google Drive' : 'GitBook'}
                      </span>
                      <span className="text-favela-green-600 font-medium">
                        Acessar →
                      </span>
                    </div>
                  </div>
                </div>
              </motion.a>
            ))}
          </motion.div>
        </motion.section>

        {/* ============================================
            SEÇÃO 2: ENTREGA DE ATIVIDADES
            ============================================ */}
        <motion.section
          {...fadeInUp}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-gradient-to-br from-favela-green-50 to-favela-blue-50 rounded-2xl shadow-xl p-8 md:p-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
              📝 Entrega de Atividades
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Faça upload do seu trabalho em formato PDF (máximo 10MB)
            </p>

            {/* Mensagem de Feedback */}
            {mensagem.texto && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-6 p-4 rounded-lg ${
                  mensagem.tipo === 'sucesso'
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {mensagem.texto}
              </motion.div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Nome do Aluno */}
              <div>
                <label htmlFor="nomeAluno" className="block text-sm font-medium text-gray-700 mb-2">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  id="nomeAluno"
                  name="nomeAluno"
                  value={formData.nomeAluno}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-favela-green-500 focus:border-transparent transition-all"
                  placeholder="Ex: Maria Silva"
                />
              </div>

              {/* Email do Aluno */}
              <div>
                <label htmlFor="emailAluno" className="block text-sm font-medium text-gray-700 mb-2">
                  Seu Email *
                </label>
                <input
                  type="email"
                  id="emailAluno"
                  name="emailAluno"
                  value={formData.emailAluno}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-favela-green-500 focus:border-transparent transition-all"
                  placeholder="Ex: maria.silva@email.com"
                />
              </div>

              {/* Nome da Atividade */}
              <div>
                <label htmlFor="nomeAtividade" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Atividade *
                </label>
                <input
                  type="text"
                  id="nomeAtividade"
                  name="nomeAtividade"
                  value={formData.nomeAtividade}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-favela-green-500 focus:border-transparent transition-all"
                  placeholder="Ex: Atividade 1 - JavaScript Básico"
                />
              </div>

              {/* Upload de Arquivo */}
              <div>
                <label htmlFor="arquivo" className="block text-sm font-medium text-gray-700 mb-2">
                  Arquivo PDF *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="arquivo"
                    name="arquivo"
                    accept=".pdf"
                    onChange={handleFileChange}
                    required
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg focus:ring-2 focus:ring-favela-green-500 focus:border-favela-green-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-favela-green-50 file:text-favela-green-700 hover:file:bg-favela-green-100 cursor-pointer"
                  />
                </div>
                {formData.arquivo && (
                  <p className="mt-2 text-sm text-gray-600">
                    ✅ Arquivo selecionado: <span className="font-medium">{formData.arquivo.name}</span>
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Apenas arquivos PDF (máximo 10MB)
                </p>
              </div>

              {/* Botão de Envio */}
              <motion.button
                type="submit"
                disabled={enviando}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-4 px-6 rounded-lg font-bold text-white text-lg shadow-lg transition-all ${
                  enviando
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-favela-green-600 to-favela-blue-600 hover:shadow-xl'
                }`}
              >
                {enviando ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </span>
                ) : (
                  '📤 Enviar Atividade'
                )}
              </motion.button>
            </form>
          </div>
        </motion.section>
      </div>

      <Footer />
    </div>
  );
};

export default Material;
