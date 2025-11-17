export type TipoDocumentoOption = {
  codigo: string;
  nombre: string;
};

const tipoDocumentoOptions: TipoDocumentoOption[] = [
  { codigo: 'DNI', nombre: 'Documento Nacional de Identidad (DNI)' },
  { codigo: 'CE', nombre: 'Carné de Extranjería (CE)' },
  { codigo: 'PASS', nombre: 'Pasaporte' },
];

export default tipoDocumentoOptions;
