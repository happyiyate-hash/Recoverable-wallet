'use client';

import { supabase } from '@/lib/supabase/client';

/**
 * INSTITUTIONAL KYC SERVICE
 * Handles identity document submission via `kyc_submissions` ledger.
 */
export const kycService = {
  /**
   * 1. STORAGE UPLOAD
   * Uploads raw documents (Selfie / ID) to `kyc-documents` regional bucket.
   */
  async uploadKycImage(file: File, userId: string): Promise<string> {
    if (!supabase) throw new Error("Supabase client disconnected.");

    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    try {
      const { error } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (error) {
          console.error("UPLOAD ERROR:", error);
          throw error;
      }

      const { data } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (e: any) {
      console.error("[KYC_UPLOAD_FAIL]", e);
      throw e;
    }
  },

  /**
   * 2. DATABASE INSERTION
   * Submits the references back into `kyc_submissions`.
   */
  async submitKyc(params: {
    userId: string;
    selfieUrl: string;
    documentUrl: string;
  }) {
    if (!supabase) throw new Error("Supabase client disconnected.");

    try {
      const { error } = await supabase
        .from('kyc_submissions')
        .insert({
          user_id: params.userId,
          selfie_url: params.selfieUrl,
          document_url: params.documentUrl,
        });

      if (error) {
          console.error("DB INSERT ERROR:", error);
          throw error;
      }

      // Automatically update standard profile link
      await supabase
        .from('profiles')
        .update({ kyc_status: 'pending' })
        .eq('id', params.userId);

    } catch (e: any) {
      console.error("[KYC_SUBMIT_FAIL]", e.message);
      throw e; // Bubble to UI
    }
  },

  /**
   * 3. MASTER FLOW (Invoked closely by the UI)
   */
  async handleKycSubmit(selfieFile: File, documentFile: File, userId: string): Promise<boolean> {
    try {
      console.log("[KYC_PIPELINE] Initializing Upload Handshake...");

      // Upload both files asynchronously 
      const [selfieUrl, documentUrl] = await Promise.all([
          this.uploadKycImage(selfieFile, userId),
          this.uploadKycImage(documentFile, userId)
      ]);

      console.log("[KYC_PIPELINE] Documents vaulted. Inserting registry footprint...");

      // Finalize database insertion
      await this.submitKyc({
        userId,
        selfieUrl,
        documentUrl
      });

      console.log("[KYC_PIPELINE] Registry footprint complete.");
      return true;
    } catch (err) {
      console.error("KYC ERROR:", err);
      throw err;
    }
  }
};
