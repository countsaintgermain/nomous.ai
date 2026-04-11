export interface Case {
    id: number;
    title: string;
    description?: string;
    signature?: string;
    status: string;
    court?: string;
    appellation?: string;
    pisp_id?: number;
    department?: string;
    receipt_date?: string;
    conclusion_date?: string;
    publication_date?: string;
    case_subject?: string;
    referent?: string;
    claim_value?: string;
    resolution?: string;
    main_entities?: string;
    created_date: string;
    updated_at?: string;
    entities: CaseEntity[];
    activities: CaseActivity[];
    hearings: CaseHearing[];
    documents: Document[];
    relations: CaseRelation[];
    saved_judgments: SavedJudgment[];
}

export interface SavedJudgment {
    id: number;
    saos_id: number;
    signature?: string;
    judgment_date?: string;
    court_name?: string;
    court_type?: string;
    division_name?: string;
    judges?: { name: string; specialRoles: string[] }[];
    content?: string;
    summary?: string;
    source: 'MANUAL' | 'AI';
    case_id: number;
    created_at: string;
    updated_at?: string;
}

export interface SaosJudgment {
    id: number;
    href: string;
    courtType: string;
    courtCases: { caseNumber: string }[];
    signatures?: string[]; // Added for v5.0 API
    judgmentType?: string;
    judges?: { name: string; specialRoles: string[] }[];
    textContent?: string;
    chunk_text?: string; // Added for hybrid highlighting
    keywords?: string[];
    division?: {
        name: string;
        court: { name: string };
    };
    judgmentDate: string;
    summary?: string;
}

export interface CaseRelation {
    id: number;
    pisp_id?: number;
    signature?: string;
    relation_type?: string;
    authority?: string;
    judge?: string;
    receipt_date?: string;
    decission_date?: string;
    result?: string;
    external_id?: string;
}

export interface CaseEntity {
    id: number;
    pisp_id?: number;
    role?: string;
    name?: string;
    address?: string;
    status?: string;
    has_access?: string;
    created_date: string;
}

export interface CaseActivity {
    id: number;
    pisp_id?: number;
    date?: string;
    signature?: string;
    activity?: string;
    submitted_by?: string;
}

export interface CaseHearing {
    id: number;
    pisp_id?: number;
    date?: string;
    room?: string;
    judge?: string;
    result?: string;
    signature?: string;
    subject?: string;
}

export interface Document {
    id: number;
    pisp_id?: number;
    filename: string;
    document_name?: string;
    tag: string;
    status: 'uploaded' | 'processing' | 'ready' | 'error' | 'pisp_remote';
    created_date: string;
    document_date?: string;
    summary?: string;
    entities?: {
        osoby?: string[];
        daty?: string[];
        kwoty?: string[];
        kary?: string[];
    };
    suggested_facts?: string[];
    has_source: boolean;
    has_pdf: boolean;
}

export interface RelevanceFeedback {
    id: number;
    case_id: number;
    document_id?: number;
    saos_id?: number;
    is_positive: boolean;
}
