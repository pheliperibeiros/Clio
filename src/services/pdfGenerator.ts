import { jsPDF } from 'jspdf';
import { OitivaMetadata } from '../types/oitiva';
import { formatSha256ForDisplay } from './cryptoHash';

export interface ExtratoData {
  metadata: OitivaMetadata;
  filename: string;
  durationSeconds: number;
  totalBytes: number;
  sha256: string;
  startedAt: Date;
  endedAt: Date;
  resolution: string;
  fps: number;
  container: string;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  }
  return `${pad(m)}m ${pad(s)}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function generateExtratoPdf(data: ExtratoData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Header Background Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Decorative subtle accent line
  doc.setFillColor(59, 130, 246); // blue-500
  doc.rect(0, 28, pageWidth, 1.5, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text((data.metadata.orgaoInstituicao || 'SISTEMA DE JUSTIÇA & MINISTÉRIO PÚBLICO').toUpperCase(), margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('EXTRATO E CERTIDÃO DE REGISTRO AUDIOVISUAL DE OITIVA', margin, 18);
  doc.text('Cadeia de Custódia Digital · Código de Processo Penal (Art. 158-B) & Lei nº 11.419/2006', margin, 23);

  let y = 40;

  // SECTION 1: Identificação do Procedimento e Pessoa Ouvida
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. IDENTIFICAÇÃO DA OITIVA E DAS PARTES', margin, y);
  y += 2;

  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Two-column grid layout for parties
  const col1X = margin;
  const col2X = margin + contentWidth / 2 + 5;

  const drawField = (label: string, value: string, x: number, currentY: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(label.toUpperCase(), x, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // slate-900
    const safeVal = value || '—';
    doc.text(safeVal, x, currentY + 4.5);
  };

  drawField('Pessoa Ouvida (Depoente)', data.metadata.nomePessoa, col1X, y);
  drawField('Qualificação / Condição', data.metadata.qualificacao || 'Testemunha', col2X, y);
  y += 12;

  drawField('Documento (CPF / RG)', data.metadata.documento || 'Não informado', col1X, y);
  drawField('Nº dos Autos / Procedimento', data.metadata.numeroProcesso || 'Não informado', col2X, y);
  y += 12;

  drawField('Autoridade Conducente', data.metadata.autoridadeResponsavel || 'Não informado', col1X, y);
  drawField('Operador / Responsável Técnico', data.metadata.responsavelGravacao || 'Não informado', col2X, y);
  y += 16;

  // SECTION 2: Dados Técnicos da Gravação
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. PARÂMETROS TÉCNICOS DO REGISTRO AUDIOVISUAL', margin, y);
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  const dateStr = data.startedAt.toLocaleDateString('pt-BR');
  const startTimeStr = data.startedAt.toLocaleTimeString('pt-BR');
  const endTimeStr = data.endedAt.toLocaleTimeString('pt-BR');

  drawField('Data da Gravação', dateStr, col1X, y);
  drawField('Horário (Início - Término)', `${startTimeStr} às ${endTimeStr}`, col2X, y);
  y += 12;

  drawField('Duração Efetiva', formatDuration(data.durationSeconds), col1X, y);
  drawField('Tamanho do Arquivo', formatBytes(data.totalBytes), col2X, y);
  y += 12;

  drawField('Resolução & Framerate', `${data.resolution} @ ${data.fps} FPS`, col1X, y);
  drawField('Formato / Contêiner', data.container || 'WebM / Matroska (Fluxo Tolerante a Falhas)', col2X, y);
  y += 12;

  drawField('Nome do Arquivo Gerado', data.filename, col1X, y);
  y += 16;

  // SECTION 3: Cadeia de Custódia e Hash Criptográfico SHA-256
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. CADEIA DE CUSTÓDIA E CÓDIGO HASH DE INTEGRIDADE (SHA-256)', margin, y);
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Box with background for cryptographic hash
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('ALGORITMO HASH CRIPTOGRÁFICO: SHA-256 (FIPS 180-4 / RFC 6234)', margin + 4, y + 6);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const formattedHash = formatSha256ForDisplay(data.sha256);
  // Split hash across 2 lines if needed
  doc.text(formattedHash.substring(0, 39), margin + 4, y + 13);
  doc.text(formattedHash.substring(40), margin + 4, y + 19);

  y += 30;

  // Declaration text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const declaracao =
    'Certifica-se, para os devidos fins legais, que o arquivo digital acima discriminado foi gerado de forma contínua durante o ato da oitiva. O valor hash SHA-256 atesta a integridade e autenticidade absoluta do conteúdo gravado, inviabilizando qualquer adulteração física ou lógica posterior sem detecção matemática imediata.';
  const splitText = doc.splitTextToSize(declaracao, contentWidth);
  doc.text(splitText, margin, y);
  y += 18;

  // SECTION 4: Termo de Encerramento e Assinaturas
  if (y > pageHeight - 55) {
    doc.addPage();
    y = 30;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('4. TERMO DE VALIDAÇÃO E ASSINATURAS', margin, y);
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  // Signature lines
  const sigWidth = 72;
  const sig1X = margin + 5;
  const sig2X = pageWidth - margin - sigWidth - 5;

  // Line 1: Autoridade
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(sig1X, y, sig1X + sigWidth, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.metadata.autoridadeResponsavel || 'Autoridade Conducente', sig1X + sigWidth / 2, y + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Presidente da Oitiva / Audiência', sig1X + sigWidth / 2, y + 8, { align: 'center' });

  // Line 2: Pessoa Ouvida
  doc.line(sig2X, y, sig2X + sigWidth, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.metadata.nomePessoa || 'Pessoa Ouvida', sig2X + sigWidth / 2, y + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(data.metadata.qualificacao || 'Depoente / Testemunha', sig2X + sigWidth / 2, y + 8, { align: 'center' });

  // Footer note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const emittedAt = new Date().toLocaleString('pt-BR');
  doc.text(`Documento gerado eletronicamente pelo Clio em ${emittedAt}.`, margin, pageHeight - 10);
  doc.text('Página 1 de 1', pageWidth - margin, pageHeight - 10, { align: 'right' });

  return doc;
}
