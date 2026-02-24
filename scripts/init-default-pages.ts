import { createClient } from '@supabase/supabase-js'
import { defaultConfigs } from '../frontend/lib/utils/page-creation'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Default pages configuration
const defaultPages = [
  {
    slug: 'tariti-gpt',
    title: 'TaritiGPT',
    description: 'AI Assistant for real estate management',
    config: defaultConfigs.taritiGPT(),
  },
  {
    slug: 'website-analytics',
    title: 'Website Analytics',
    description: 'Analytics for Sudic 1 and Sudic 2 websites',
    config: defaultConfigs.websiteAnalytics(),
  },
  {
    slug: 'moizvonki-analytics',
    title: 'Moizvonki Analytics',
    description: 'Call analytics from Moizvonki',
    config: defaultConfigs.moizvonkiAnalytics(),
  },
  {
    slug: 'amocrm-analytics',
    title: 'AmoCRM Analytics',
    description: 'Real estate and property analytics from AmoCRM',
    config: defaultConfigs.amocrmAnalytics(),
  },
  {
    slug: 'ai-page-builder',
    title: 'AI Page Builder',
    description: 'Create custom pages with AI',
    config: defaultConfigs.aiPageBuilder(),
  },
  {
    slug: 'custom-pages',
    title: 'Custom Pages',
    description: 'Manage your custom pages',
    config: defaultConfigs.customPages(),
  },
]

async function initDefaultPages() {
  try {
    console.log('Starting initialization of default pages...')

    // First, check if we already have any pages
    const { data: existingPages, error: fetchError } = await supabase
      .from('pages')
      .select('slug')

    if (fetchError) throw fetchError

    const existingSlugs = new Set(existingPages?.map(p => p.slug) || [])
    const pagesToCreate = defaultPages.filter(page => !existingSlugs.has(page.slug))

    if (pagesToCreate.length === 0) {
      console.log('All default pages already exist. No action needed.')
      return
    }

    console.log(`Found ${pagesToCreate.length} pages to create...`)

    // Create pages that don't exist
    const { data: createdPages, error: createError } = await supabase
      .from('pages')
      .insert(pagesToCreate.map(page => ({
        ...page,
        published: true,
        creator: '00000000-0000-0000-0000-000000000000', // System user
      })))
      .select()

    if (createError) throw createError

    console.log(`Successfully created ${createdPages?.length || 0} default pages!`)
    console.log('Pages created:', createdPages?.map(p => p.slug).join(', '))

  } catch (error) {
    console.error('Error initializing default pages:', error)
    process.exit(1)
  }
}

// Run the initialization
initDefaultPages()
  .then(() => {
    console.log('Default pages initialization completed.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to initialize default pages:', error)
    process.exit(1)
  })
