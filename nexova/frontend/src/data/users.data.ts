// File: src/data/users.data.ts

export type UserRole = 'Asesor' | 'Admin' | 'Owner';

export interface UserCredential {
  id: string;
  name: string;
  email: string;
  password: string; // En un entorno real esto estaría hasheado
  role: UserRole;
  phone: string;
  asesorId?: string | null;
}

export const USERS_REGISTRY: UserCredential[] = [
  // Asesores
  { id: 'U-001', name: 'Saúl Gómez', email: 'tuproximohogar@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5644090292' },
  { id: 'U-002', name: 'Paulina Díaz', email: 'paulina.diaz06@outlook.com', password: 'Nexova2026!', role: 'Asesor', phone: '5569251492' },
  { id: 'U-003', name: 'Arturo Alvarado', email: 'inmobiliarianuevohogar26@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5664776093' },
  { id: 'U-004', name: 'Maya Rodriguez', email: 'tucasahogarseguro@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5639540576' },
  { id: 'U-005', name: 'Alejandro Zamora', email: 'alezamora8881@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5570798881' },
  { id: 'U-006', name: 'Angel Flores', email: 'aflores.garevazenith@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5661119651' },
  { id: 'U-007', name: 'Julio Maya', email: 'juliomayazenith@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5514852600' },
  { id: 'U-008', name: 'Abraham Mendoza', email: 'tupatrimonioeshoy87@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5648645979' },
  { id: 'U-009', name: 'Regina Montiel', email: 'asesorinmobiliario0012@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5560120766' },
  { id: 'U-010', name: 'Mayte Rodríguez', email: 'mr.inmobiliaria.06@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5514563975' },
  { id: 'U-011', name: 'Andrea Molina', email: 'andrea.inmuebleszenith@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5664933344' },
  { id: 'U-012', name: 'Daniel del Toro', email: 'supercasasmex@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '3334017238' },
  { id: 'U-013', name: 'Paola Bracho', email: 'paola.brachozenith@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5510516048' },
  { id: 'U-014', name: 'Isabella Betancourth', email: 'inmuebles.carrizo@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5643230668' },
  { id: 'U-015', name: 'Hernán San Román', email: 'hernansanromantorres@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5656767891' },
  { id: 'U-016', name: 'Luna Ferrat', email: 'luna.inmuebles7@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5664897126' },
  { id: 'U-017', name: 'Gilberto Cruz', email: 'gilbertocruzzenith@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5525978343' },
  { id: 'U-018', name: 'Daniel del la Vega', email: 'daniel.inmobiliaria@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5664789573' },
  { id: 'U-019', name: 'Mario Santos', email: 'mariosantosinmobiliaria@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5526597184' },
  { id: 'U-020', name: 'Didier Mejia', email: 'didier.inmobiliaria@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5565021482' },
  { id: 'U-021', name: 'Lucia Salas', email: 'luckysalas2003@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5565339281' },
  { id: 'U-022', name: 'Aurora Beltrán', email: 'asesorainmobiliaria152995@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5665646193' },
  { id: 'U-023', name: 'Patricia Hernández', email: 'solucionesinmobiliarias922@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5665023912' },
  { id: 'U-024', name: 'Catalina Aguilera', email: 'ca.inmobilliaria2026@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5541061982' },
  { id: 'U-025', name: 'Beatriz Lozano', email: 'beinmobiliaria8@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5570516428' },
  { id: 'U-026', name: 'Hugo Loera', email: 'asesordan.inmobiliaria@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5566278193' },
  { id: 'U-027', name: 'Antonio Escobar', email: 'inmobiliaria.soluciones95@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5525627194' },
  { id: 'U-028', name: 'Roberto Mendoza', email: 'garantiabanco01@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5553858129' },
  { id: 'U-029', name: 'Nicolás Morales', email: 'garantiahipotecaria5@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5570717281' },
  { id: 'U-030', name: 'Santiago Martínez Núñez', email: 'garantiainmobiliaria09@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5665041928' },
  { id: 'U-031', name: 'Ximena Mendoza', email: 'miasesorinmobiliario0@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5665093182' },
  { id: 'U-032', name: 'Dylan Torres García', email: 'recuperacionesbancarias.el@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5664960192' },
  { id: 'U-033', name: 'Mar Mejía', email: 'lacasadetuvida14@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5610832918' },
  { id: 'U-034', name: 'Dereck Ponce', email: 'inmobiliariagrvs1@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5664861928' },
  { id: 'U-035', name: 'Joshua Díaz', email: 'inmobiliariogrvs@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5664899182' },
  { id: 'U-036', name: 'Lucia', email: 'asesorinmobi2516@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5566834192' },
  { id: 'U-037', name: 'Alejandra Dorado', email: 'asesorinmobi789@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5567916281' },
  { id: 'U-038', name: 'Estrella López', email: 'asesoriacasas456@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5563340192' },
  { id: 'U-039', name: 'David López', email: 'asesorinmobi1012@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5651769182' },
  { id: 'U-040', name: 'Luis Ramírez', email: 'asesorinmbi1305@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5656799182' },
  { id: 'U-041', name: 'Leonardo', email: 'asesoriainmobiliaria911@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5536679182' },
  { id: 'U-042', name: 'Fernanda Silva', email: 'tuinverion.futuroseguro@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5643734192' },
  { id: 'U-043', name: 'Marco Antonio Cortez Ortiz', email: 'bienesraicesvlf@gmail.com', password: 'Nexova2026!', role: 'Asesor', phone: '5662813918' },
  
  // Administradores
  { id: 'U-044', name: 'Lizette Trejo', email: 'garevazenith@gmail.com', password: 'Nexova2026@@', role: 'Admin', phone: 'S/N' },
  { id: 'U-045', name: 'Gael Solis', email: 'pathfinderxdxd@gmail.com', password: 'Nexova2026@@', role: 'Admin', phone: 'S/N' },
  
  // Owner
  { id: 'U-046', name: 'Ivan Monte Rosas', email: 'ivanmtrosas@gmail.com', password: 'Nexova2026@@', role: 'Owner', phone: 'S/N' }
];
