export function usePageSeo({ title, description, path }) {
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')
  const url = computed(() => `${siteUrl}${unref(path)}`)

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogType: 'website',
    ogUrl: url,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description
  })

  useHead({
    htmlAttrs: {
      lang: 'zh-Hant'
    },
    link: computed(() => [
      {
        rel: 'canonical',
        href: url.value
      }
    ])
  })

  return { url, siteUrl }
}

export function useWebPageJsonLd({ name, description, url, extra = [] }) {
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')
  const siteName = config.public.siteName
  const siteDescription = config.public.siteDescription

  useHead({
    script: computed(() => [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebSite',
              name: siteName,
              url: siteUrl,
              description: siteDescription
            },
            {
              '@type': 'WebPage',
              name: unref(name),
              description: unref(description),
              url: unref(url),
              isPartOf: {
                '@type': 'WebSite',
                name: siteName
              }
            },
            ...unref(extra)
          ]
        })
      }
    ])
  })
}
