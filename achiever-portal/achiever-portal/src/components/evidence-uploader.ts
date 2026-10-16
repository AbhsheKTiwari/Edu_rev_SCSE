"use client";

import { createBrowserSupabase } from "@/lib/supabase/browser";
import { prepareUpload, registerUploadedFile } from "@/lib/actions/student";

export interface UploadResult {
  name: string;
  ok: boolean;
  error: string | null;
}

/**
 * Uploads files straight from the browser to the PRIVATE "evidence" bucket
 * (avoids Vercel's 4.5 MB request limit), then asks the server to verify and record each one.
 */
export async function uploadEvidence(
  submissionId: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<UploadResult[]> {
  const supabase = createBrowserSupabase();
  const results: UploadResult[] = [];
  let done = 0;
  for (const file of files) {
    const prep = await prepareUpload(submissionId, file.name, file.size);
    if (!prep.path) {
      results.push({ name: file.name, ok: false, error: prep.error });
    } else {
      const { error } = await supabase.storage.from("evidence").upload(prep.path, file, {
        upsert: false,
        contentType: file.type || undefined,
        cacheControl: "0",
      });
      if (error) {
        results.push({ name: file.name, ok: false, error: `Upload failed for "${file.name}". Please retry.` });
      } else {
        const reg = await registerUploadedFile(submissionId, prep.path, file.name);
        results.push({ name: file.name, ok: reg.ok, error: reg.error });
      }
    }
    done += 1;
    onProgress?.(done, files.length);
  }
  return results;
}
