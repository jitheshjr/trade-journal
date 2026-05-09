import { supabase } from './supabase'

export async function uploadScreenshot(file, userId) {
  const ext = file.name.split('.').pop()
  const filename = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('trade-screenshots')
    .upload(filename, file, { upsert: false })

  if (error) return { url: null, error }

  const { data } = supabase.storage
    .from('trade-screenshots')
    .getPublicUrl(filename)

  // Since bucket is private, use signed URL instead
  const { data: signed, error: signErr } = await supabase.storage
    .from('trade-screenshots')
    .createSignedUrl(filename, 60 * 60 * 24 * 365) // 1 year

  if (signErr) return { url: null, error: signErr }

  return { url: signed.signedUrl, path: filename, error: null }
}

export async function deleteScreenshot(path) {
  const { error } = await supabase.storage
    .from('trade-screenshots')
    .remove([path])
  return { error }
}