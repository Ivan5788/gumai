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
    ogSiteName: config.public.siteName,
    ogLocale: 'zh_TW',
    // 目前無 OG 圖，用 summary；有設計稿後改 summary_large_image + og:image
    twitterCard: 'summary',
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

export function useWebPageJsonLd({ name, description, url, extra = [], siteActions = false }) {
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')
  const siteName = config.public.siteName
  const siteDescription = config.public.siteDescription

  const website = {
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    description: siteDescription
  }

  if (siteActions) {
    website.publisher = {
      '@type': 'Organization',
      name: siteName,
      url: siteUrl
    }
    website.potentialAction = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/signals?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  }

  useHead({
    script: computed(() => [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            website,
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
