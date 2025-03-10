const { makeBadge } = require('badge-maker');
const fs = require('fs');

// Badge generation function
const createBadgeWithDescription = (badgeDetails) => {
  const format = {
    label: badgeDetails.label || 'Achievement',
    message: badgeDetails.message || 'Default Message',
    labelColor: badgeDetails.labelColor || '#555',
    color: badgeDetails.color || '#FF4500',
    style: badgeDetails.style || 'flat-square',
    // Remove logoBase64 completely if not required
  };

  const badgeSvg = makeBadge(format);
  const fileName = `./badges/${badgeDetails.id}.svg`;
  fs.writeFileSync(fileName, badgeSvg);
  console.log(`Badge saved as: ${fileName}`);

  return {
    id: badgeDetails.id,
    label: badgeDetails.label,
    message: badgeDetails.message,
    description: badgeDetails.description,
    path: fileName
  };
};

const generateBadges = () => {
  // Ensure the badges directory exists
  fs.mkdirSync('./badges', { recursive: true });

  // Array of badge definitions
  const badges = [
    {
      id: 'badge_001',
      label: 'Top Contributor',
      message: 'Gold Tier',
      labelColor: '#333',
      color: '#FFD700',
      description: 'Awarded for making the most contributions.'
    },
    {
      id: 'badge_002',
      label: 'Bug Hunter',
      message: 'Elite',
      labelColor: '#444',
      color: '#FF4500',
      description: 'Given for identifying and resolving critical bugs.'
    },
    {
      id: 'badge_003',
      label: 'Mentor',
      message: 'Guide',
      labelColor: '#222',
      color: '#4CAF50',
      description: 'Recognized for mentoring new team members and providing guidance.'
    }
  ];

  const metadataList = [];
  badges.forEach((badge) => {
    const metadata = createBadgeWithDescription(badge);
    metadataList.push(metadata);
  });

  // Save all metadata to badges.json
  fs.writeFileSync('./badges/badges.json', JSON.stringify(metadataList, null, 2));
  console.log('Metadata saved to ./badges/badges.json');
};

generateBadges();
