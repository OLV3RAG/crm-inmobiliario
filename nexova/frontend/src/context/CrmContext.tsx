// File: src/context/CrmContext.tsx
import { io } from 'socket.io-client';
import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { Contact, Property, Opportunity, Quote, AuditLog, PipelineStage } from '@/types/crm.types';
import { useAuthContext, decodeJWT } from '@/context/AuthContext';
import { USERS_REGISTRY } from '@/data/users.data';
import { crmApi } from '@/services/crm.api';

export interface AgencyStats {
  activeValue: number;
  projectedCommissions: number;
  conversionRate: string;
  totalContacts: number;
  wonDealsValue: number;
  wonCommissions: number;
}

interface CrmContextType {
  contacts: Contact[];
  properties: Property[];
  opportunities: Opportunity[];
  quotes: Quote[];
  users: any[];
  auditLogs: AuditLog[];
  myDeals: Opportunity[];
  myProperties: Property[];
  myLeads: Contact[];
  agencyStats: AgencyStats;
  selectedAdvisorFilter: string | null;
  setSelectedAdvisorFilter: (id: string | null) => void;
  isLoading: boolean;
  addContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'assignedAdvisorId' | 'assignedAdvisorEmail' | 'assignedTo'>) => void;
  updatePropertySync: (id: string) => void;
  applyProperty: (property: Property) => void;
  updateOpportunityStage: (id: string, stage: PipelineStage) => void;
  addQuote: (quote: Omit<Quote, 'id' | 'date' | 'status' | 'assignedAdvisorId' | 'assignedAdvisorEmail'>) => void;
}

const defaultStats: AgencyStats = {
  activeValue: 0,
  projectedCommissions: 0,
  conversionRate: '0%',
  totalContacts: 0,
  wonDealsValue: 0,
  wonCommissions: 0
};

const CrmContext = createContext<CrmContextType | undefined>(undefined);

export const useCrmContext = () => {
  const context = useContext(CrmContext);
  if (!context) throw new Error('useCrmContext debe utilizarse dentro de un CrmProvider');
  return context;
};

export function CrmProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuthContext();
  
  const [users, setUsers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedAdvisorFilter, setSelectedAdvisorFilter] = useState<string | null>(null);
  const [agencyStatsAPI, setAgencyStatsAPI] = useState<AgencyStats | null>(null);

  // Configuración de Socket.io para Tiempo Real
  useEffect(() => {
    const socket = io(); // Conecta al mismo host
    
    socket.on('deal_updated', (updatedDeal) => {
      setOpportunities(prev => prev.map(opp => opp.id === updatedDeal.id ? updatedDeal : opp));
    });
    
    socket.on('lead_updated', (updatedLead) => {
      // Si existiera lógica de leads en este contexto general
      // setContacts(...)
    });

    return () => {
      socket.disconnect();
    };
  }, []);


  // Sincronización con el Backend Real (Nova Arc Tech API)
  useEffect(() => {
    if (!currentUser) return;
    
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    
    const payload = decodeJWT(token);
    const businessId = payload?.businessId || '1f91abd5-0436-467d-bb75-fb212c6e7230';
    
    let targetAsesorId: string | null = null;
    if (currentUser.role === 'Admin' || currentUser.role === 'Owner') {
      targetAsesorId = selectedAdvisorFilter;
    } else {
      targetAsesorId = currentUser.id;
    }
    
    let isMounted = true;
    
    const fetchCrmData = async () => {
      setIsLoading(true);
      try {
        const [leadsRes, propsRes, dealsRes, statsRes, quotesRes, usersRes] = await Promise.allSettled([
          crmApi.getLeads(targetAsesorId),
          crmApi.getProperties(targetAsesorId),
          crmApi.getPipelineDeals(targetAsesorId),
          crmApi.getDashboardStats(businessId, targetAsesorId),
          crmApi.getQuotes(targetAsesorId),
          crmApi.getUsers()
        ]);

        if (!isMounted) return;

        // Limpiamos los datos estáticos y usamos los del payload real
        if (leadsRes.status === 'fulfilled' && Array.isArray(leadsRes.value)) setContacts(leadsRes.value);
        if (propsRes.status === 'fulfilled' && Array.isArray(propsRes.value)) setProperties(propsRes.value);
        if (dealsRes.status === 'fulfilled' && Array.isArray(dealsRes.value)) setOpportunities(dealsRes.value);
        if (statsRes.status === 'fulfilled' && statsRes.value) setAgencyStatsAPI(statsRes.value);
        if (quotesRes.status === 'fulfilled' && Array.isArray(quotesRes.value)) setQuotes(quotesRes.value);
        if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) setUsers(usersRes.value);

      } catch (error) {
        console.error('Error fetching CRM data', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchCrmData();
    
    return () => {
      isMounted = false;
    };
  }, [currentUser, selectedAdvisorFilter]);

  // Client-side filtering enforcement
  const filterByAdvisor = useCallback((advisorId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'Asesor') return advisorId === currentUser.id;
    if (selectedAdvisorFilter) return advisorId === selectedAdvisorFilter;
    return true; 
  }, [currentUser, selectedAdvisorFilter]);

  const myDeals = useMemo(() => opportunities.filter(o => filterByAdvisor(o.assignedAdvisorId)), [opportunities, filterByAdvisor]);
  const myProperties = useMemo(() => properties.filter(p => filterByAdvisor(p.assignedAdvisorId)), [properties, filterByAdvisor]);
  const myLeads = useMemo(() => contacts.filter(c => filterByAdvisor(c.assignedAdvisorId)), [contacts, filterByAdvisor]);

  const agencyStats = useMemo<AgencyStats>(() => {
    // Si la API devolvió las estadísticas calculadas en el backend, priorizarlas
    if (agencyStatsAPI) return agencyStatsAPI;

    // Fallback de contingencia: Cálculo local en caso de que el endpoint falle temporalmente
    const activeDeals = myDeals.filter(o => o.stage !== 'Ganado' && o.stage !== 'Perdido');
    const wonDeals = myDeals.filter(o => o.stage === 'Ganado');
    
    const activeValue = activeDeals.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const wonDealsValue = wonDeals.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    
    return {
      activeValue,
      projectedCommissions: activeValue * 0.05,
      wonDealsValue,
      wonCommissions: wonDealsValue * 0.05,
      conversionRate: myDeals.length > 0 ? `${Math.round((wonDeals.length / myDeals.length) * 100)}%` : '0%',
      totalContacts: myLeads.length
    };
  }, [myDeals, myLeads, agencyStatsAPI]);

  const addAuditLog = useCallback((action: string, module: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLog = {
      id: `AL-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      module,
      details,
      timestamp: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [currentUser]);

  const addContact = useCallback((contactData: Omit<Contact, 'id' | 'createdAt' | 'assignedAdvisorId' | 'assignedAdvisorEmail' | 'assignedTo'>) => {
    if (!currentUser) return;
    const targetUserId = (currentUser.role === 'Admin' || currentUser.role === 'Owner') && selectedAdvisorFilter 
      ? selectedAdvisorFilter 
      : currentUser.id;
    
    const assignedUser = USERS_REGISTRY.find(u => u.id === targetUserId) || currentUser;

    const newContact: Contact = {
      ...contactData,
      id: `C${Date.now()}`,
      assignedTo: assignedUser.name,
      assignedAdvisorId: assignedUser.id,
      assignedAdvisorEmail: assignedUser.email,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setContacts(prev => [newContact, ...prev]);
    addAuditLog('Creó prospecto', 'Contactos', `Registró al contacto "${contactData.name}" para ${assignedUser.name}`);
  }, [currentUser, selectedAdvisorFilter, addAuditLog]);

  const applyProperty = useCallback((property: Property) => {
    setProperties((prev) => {
      const index = prev.findIndex((item) => item.id === property.id);
      if (index === -1) return [property, ...prev];
      const next = [...prev];
      next[index] = {
        ...prev[index],
        ...property,
        assignedAdvisorId: property.assignedAdvisorId || prev[index].assignedAdvisorId,
        assignedAdvisorEmail: property.assignedAdvisorEmail || prev[index].assignedAdvisorEmail,
      };
      return next;
    });
  }, []);

  const updatePropertySync = useCallback((id: string) => {
    setProperties(prev => prev.map(p => {
      if (p.id === id) {
        const newValue = !p.syncWeb;
        addAuditLog('Actualizó visibilidad', 'Inventario', `Propiedad ${p.code} ahora es ${newValue ? 'visible' : 'oculta'}`);
        return { ...p, syncWeb: newValue };
      }
      return p;
    }));
  }, [addAuditLog]);

  const updateOpportunityStage = useCallback((id: string, stage: PipelineStage) => {
    setOpportunities(prev => prev.map(opp => {
      if (opp.id === id) {
        addAuditLog('Actualizó estado', 'Pipeline', `Cambió oportunidad "${opp.title}" a "${stage}"`);
        return { ...opp, stage, lastUpdate: 'Justo ahora' };
      }
      return opp;
    }));
  }, [addAuditLog]);

  const addQuote = useCallback((quoteData: Omit<Quote, 'id' | 'date' | 'status' | 'assignedAdvisorId' | 'assignedAdvisorEmail'>) => {
    if (!currentUser) return;
    const targetUserId = (currentUser.role === 'Admin' || currentUser.role === 'Owner') && selectedAdvisorFilter 
      ? selectedAdvisorFilter 
      : currentUser.id;
    const assignedUser = USERS_REGISTRY.find(u => u.id === targetUserId) || currentUser;

    const newQuote: Quote = {
      ...quoteData,
      id: `COT-${Date.now()}`,
      status: 'Borrador',
      date: new Date().toISOString().split('T')[0],
      assignedAdvisorId: assignedUser.id,
      assignedAdvisorEmail: assignedUser.email
    };
    setQuotes(prev => [newQuote, ...prev]);
    addAuditLog('Creó cotización', 'Cotizaciones', `Generó propuesta para ${quoteData.clientName}`);
  }, [currentUser, selectedAdvisorFilter, addAuditLog]);

  return (
    <CrmContext.Provider value={{
      contacts,
      properties,
      opportunities,
      quotes,
      users,
      auditLogs,
      myDeals,
      myProperties,
      myLeads,
      agencyStats,
      selectedAdvisorFilter,
      setSelectedAdvisorFilter,
      isLoading,
      addContact,
      updatePropertySync,
      applyProperty,
      updateOpportunityStage,
      addQuote
    }}>
      {children}
    </CrmContext.Provider>
  );
}

