import { useState } from 'react';
import { Smartphone, User, Mail, Phone, ArrowRight, Loader2, Shield, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import knowriskLogo from '@/assets/knowrisk-pwa-logo.png';

interface PWARegisterScreenProps {
  fingerprint: string;
  onRegister: (params: { phone: string; name?: string; email?: string }) => Promise<{ success: boolean; error?: string }>;
  isSubmitting: boolean;
}

export function PWARegisterScreen({ fingerprint, onRegister, isSubmitting }: PWARegisterScreenProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; email?: string }>({});

  const formatPhone = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Formatar como (XX) XXXXX-XXXX
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { phone?: string; email?: string } = {};
    
    // Validar telefone (precisa ter 11 dígitos)
    const phoneNumbers = phone.replace(/\D/g, '');
    if (!phoneNumbers || phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      newErrors.phone = 'Digite um telefone válido com DDD';
    }
    
    // Validar email (opcional, mas se preenchido deve ser válido)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Digite um email válido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const phoneNumbers = phone.replace(/\D/g, '');
    
    const result = await onRegister({
      phone: phoneNumbers,
      name: name.trim() || undefined,
      email: email.trim() || undefined,
    });
    
    if (!result.success) {
      toast.error(result.error || 'Erro ao registrar');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6">
      {/* Logo e Título */}
      <div className="mb-8 text-center animate-fade-in">
        <div className="relative inline-block mb-4">
          <img
            src={knowriskLogo}
            alt="KnowRisk PWA"
            className="w-20 h-20 mx-auto rounded-2xl shadow-lg shadow-emerald-500/20"
          />
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Bem-vindo ao KnowRisk
        </h1>
        <p className="text-slate-400 text-sm max-w-xs">
          Registre seu dispositivo para acessar o assistente de voz
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 animate-fade-in">
        {/* Telefone (obrigatório) */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-slate-300 flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-500" />
            Telefone <span className="text-red-400">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={handlePhoneChange}
            className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 ${errors.phone ? 'border-red-500' : ''}`}
            disabled={isSubmitting}
          />
          {errors.phone && (
            <p className="text-red-400 text-xs">{errors.phone}</p>
          )}
          <p className="text-slate-500 text-xs flex items-center gap-1">
            <Info className="w-3 h-3" />
            Você receberá um código por SMS
          </p>
        </div>

        {/* Nome (opcional) */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-slate-300 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            Nome <span className="text-slate-600">(opcional)</span>
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
            disabled={isSubmitting}
          />
        </div>

        {/* Email (opcional) */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-300 flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-500" />
            Email <span className="text-slate-600">(opcional)</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
            }}
            className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 ${errors.email ? 'border-red-500' : ''}`}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="text-red-400 text-xs">{errors.email}</p>
          )}
        </div>

        {/* Botão de Submit */}
        <Button
          type="submit"
          disabled={isSubmitting || !phone}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-6 mt-6 transition-all duration-200"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              Continuar
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </form>

      {/* Info de Segurança */}
      <div className="mt-8 flex items-center gap-2 text-slate-500 text-xs animate-fade-in">
        <Shield className="w-4 h-4" />
        <span>Seus dados estão protegidos</span>
      </div>

      {/* Device ID (para debug) */}
      <p className="mt-4 text-slate-700 text-xs font-mono">
        {fingerprint.slice(0, 20)}...
      </p>
    </div>
  );
}
