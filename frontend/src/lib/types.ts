export interface Case {
    id: number;
    title: string;
    description?: string;
    signature?: string;
    status: string;
    court?: string;
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
}

export interface Document {
    id: number;
    pisp_id?: number;
    filename: string;
    document_name?: string;
    tag: string;
    status: 'uploaded' | 'processing' | 'ready' | 'error';
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
