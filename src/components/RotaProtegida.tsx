/**
 * ============================================
 * GUARDA DAS ROTAS RESTRITAS
 * ============================================
 *
 * Envolve páginas que só alguns papéis podem abrir (ex.: só gestor).
 * Sem login, ou com outro papel, a pessoa volta para /login.
 *
 * Isto é só conforto de navegação: quem protege os dados de verdade são as
 * regras RLS do banco, que não entregam nada para quem não tem permissão.
 */
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase, carregarPerfil, type Papel } from '../lib/supabase';
import { jaPreencheuDados } from '../lib/dadosInstrutor';
import Carregamento from './admin/Carregamento';

const RotaProtegida: React.FC<{ papeis: Papel[]; children: React.ReactNode }> = ({ papeis, children }) => {
  const [estado, setEstado] = useState<
    'verificando' | 'liberado' | 'negado' | 'primeiro-acesso' | 'dados-do-instrutor'
  >('verificando');
  const chavePapeis = papeis.join(',');

  useEffect(() => {
    let ativo = true;
    const permitidos = chavePapeis.split(',');

    const verificar = async () => {
      const { data } = await supabase.auth.getSession();
      const usuario = data.session?.user;
      const perfil = usuario ? await carregarPerfil(usuario.id) : null;
      if (!ativo) return;
      if (!perfil?.papel || !permitidos.includes(perfil.papel)) return setEstado('negado');
      if (perfil.papel === 'aluno') {
        // Aluno só entra com a conta ligada a uma turma, e depois do primeiro acesso
        if (!perfil.participanteId && !perfil.podeAlternarPapel) return setEstado('negado');
        if (perfil.precisaTrocarSenha) return setEstado('primeiro-acesso');
      }
      // Instrutor só entra depois de preencher os dados do RPA (a conta de
      // demonstração, que só "vê como" instrutor, fica de fora)
      if (perfil.papel === 'professor' && !perfil.podeAlternarPapel && usuario) {
        const preencheu = await jaPreencheuDados(usuario.id);
        if (!ativo) return;
        if (!preencheu) return setEstado('dados-do-instrutor');
      }
      setEstado('liberado');
    };
    verificar();

    // Se a sessão acabar (sair em outra aba, token expirado), volta para o login
    const { data: ouvinte } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT' && ativo) setEstado('negado');
    });

    return () => {
      ativo = false;
      ouvinte.subscription.unsubscribe();
    };
  }, [chavePapeis]);

  if (estado === 'negado') return <Navigate to="/login" replace />;
  if (estado === 'primeiro-acesso') return <Navigate to="/primeiro-acesso" replace />;
  if (estado === 'dados-do-instrutor') return <Navigate to="/dados-do-instrutor" replace />;

  if (estado === 'verificando') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Carregamento texto="Verificando acesso" />
      </div>
    );
  }

  // Entra em fade (sem troca seca entre "verificando acesso" e a área)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {children}
    </motion.div>
  );
};

export default RotaProtegida;
