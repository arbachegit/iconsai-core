import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Share2, MessageCircle, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ContentShareActionsProps {
  contentRef: React.RefObject<HTMLDivElement>;
  filename?: string;
  title?: string;
  compact?: boolean;
}

export const ContentShareActions = ({ 
  contentRef, 
  filename = 'conteudo', 
  title = 'Conteúdo',
  compact = false 
}: ContentShareActionsProps) => {
  const { toast } = useToast();

  const captureImage = async (): Promise<string | null> => {
    if (!contentRef.current) return null;
    
    try {
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 2,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error capturing content:', error);
      return null;
    }
  };

  const handleDownloadPNG = async () => {
    const imageData = await captureImage();
    if (!imageData) {
      toast({ title: 'Erro ao capturar imagem', variant: 'destructive' });
      return;
    }

    const link = document.createElement('a');
    link.href = imageData;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
    link.click();
    toast({ title: 'Imagem baixada com sucesso!' });
  };

  const handleDownloadPDF = async () => {
    const imageData = await captureImage();
    if (!imageData) {
      toast({ title: 'Erro ao capturar imagem', variant: 'destructive' });
      return;
    }

    const pdf = new jsPDF('l', 'mm', 'a4');
    const img = new Image();
    img.src = imageData;
    
    img.onload = () => {
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;
      pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
      pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: 'PDF baixado com sucesso!' });
    };
  };

  const handleShareWhatsApp = async () => {
    const text = encodeURIComponent(`${title}\n\nVisualize o conteúdo completo no KnowYOU!`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    toast({ title: 'Abrindo WhatsApp...' });
  };

  const handleShareEmail = async () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${title}\n\nVisualize o conteúdo completo no KnowYOU!`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    toast({ title: 'Abrindo e-mail...' });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <Download className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDownloadPNG}>
              PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadPDF}>
              PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleShareWhatsApp} title="WhatsApp">
          <MessageCircle className="h-3 w-3" />
        </Button>
        
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleShareEmail} title="E-mail">
          <Mail className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Download className="h-3 w-3 mr-1" />
            Baixar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDownloadPNG}>
            Baixar PNG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadPDF}>
            Baixar PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleShareWhatsApp}>
        <MessageCircle className="h-3 w-3 mr-1" />
        WhatsApp
      </Button>
      
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleShareEmail}>
        <Mail className="h-3 w-3 mr-1" />
        E-mail
      </Button>
    </div>
  );
};
