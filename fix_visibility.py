import sys

with open('src/app/HomeEditor.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'if (!config.imageListing) return null;',
    'if (!config.imageListing || !config.imageListing.visible) return null;'
)

with open('src/app/HomeEditor.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/app/HomeClient.tsx', 'r', encoding='utf-8') as f:
    hc = f.read()

if 'case "imageListing":' not in hc:
    hc = hc.replace(
        '      case "landingSection":',
        '''      case "videoGallery":
        const vGalleryConf = config.videoGallery || { visible: false, images: [], videoUrl: "", videoType: "youtube" as const, effect: "none" as const };
        if (!vGalleryConf.visible) return null;
        return (
          <VideoGallery
            id={vGalleryConf.anchorId || "videoGallery"}
            images={vGalleryConf.images}
            videoUrl={vGalleryConf.videoUrl}
            videoType={vGalleryConf.videoType}
            effect={vGalleryConf.effect}
            backgroundColor={vGalleryConf.backgroundColor || globalSettings.backgroundColor}
          />
        );
      case "imageListing":
        if (!config.imageListing || !config.imageListing.visible) return null;
        return (
          <ImageListingSection
            id={config.imageListing.anchorId || "imageListing"}
            images={config.imageListing.images}
            imagesPerRow={config.imageListing.imagesPerRow}
            form={config.imageListing.form}
            backgroundColor={config.imageListing.backgroundColor || globalSettings.backgroundColor}
            isEditing={false}
          />
        );
      case "landingSection":'''
    )

    hc = hc.replace(
        'import { LandingSection } from "@/components/sections/LandingSection";',
        'import { LandingSection } from "@/components/sections/LandingSection";\nimport { VideoGallery } from "@/components/sections/VideoGallery";\nimport { ImageListingSection } from "@/components/sections/ImageListingSection";'
    )

with open('src/app/HomeClient.tsx', 'w', encoding='utf-8') as f:
    f.write(hc)

print('Updated visibility and sections')
