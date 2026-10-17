// DocumentCategory and DocumentVisibility enums (backend/Enums), sent as numbers.
export type DocumentCategory = 1 | 2 | 3 | 4 | 5 | 6;
export type DocumentVisibility = 1 | 2;

export type DocumentResponse = {
  id: number;
  condominiumId: number;
  title: string;
  description: string | null;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentDetailsRequest = {
  title: string;
  description: string | null;
  category: DocumentCategory;
  visibility: DocumentVisibility;
};

export type CreateDocumentRequest = DocumentDetailsRequest & { file: File };
