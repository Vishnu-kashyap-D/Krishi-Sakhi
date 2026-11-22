// Inserts starter content (sample marketplace listings and forum threads) the
// first time the tables are created, so a fresh install is not empty.
// Nothing is inserted if the table already contains rows.
const { Product, ForumPost, ForumComment } = require('./index');

const sampleProducts = [
  {
    title: 'Organic Rice Seeds - Kerala Red Rice',
    description: 'Premium quality organic red rice seeds, suitable for Kerala climate. High yield variety.',
    category: 'seeds', price: 150, unit: 'kg', quantity: 100,
    sellerName: 'Ravi Kumar', location: { district: 'Thrissur', state: 'Kerala' }, isNegotiable: true
  },
  {
    title: 'NPK Fertilizer 19-19-19',
    description: 'Balanced water-soluble NPK fertilizer suitable for all crops.',
    category: 'fertilizers', price: 450, unit: 'packet', quantity: 50,
    sellerName: 'Agri Store Palakkad', location: { district: 'Palakkad', state: 'Kerala' }, isNegotiable: false
  },
  {
    title: 'Fresh Coconuts - Grade A',
    description: 'Fresh coconuts from coastal Kerala. Suitable for oil extraction and household use.',
    category: 'crops', price: 25, unit: 'piece', quantity: 500,
    sellerName: 'Coconut Farmer Kollam', location: { district: 'Kollam', state: 'Kerala' }, isNegotiable: true
  }
];

const samplePosts = [
  {
    authorName: 'Rajesh Kumar', authorLocation: 'Bhiwani, Haryana', language: 'en', category: 'crop-disease',
    title: 'Yellow Rust Disease in Wheat',
    content: 'My wheat crop has been affected by yellow rust disease. Please suggest treatment options.',
    comments: [{ authorName: 'Dr. Singh', content: 'Apply Propiconazole 25% EC spray (1 ml per litre of water) for effective control, and repeat after 15 days if needed.' }]
  },
  {
    authorName: 'Priya Sharma', authorLocation: 'Rohtak, Haryana', language: 'en', category: 'organic-farming',
    title: 'Method for Making Organic Compost',
    content: 'I have successfully made organic compost at home using crop residue, cow dung and a little soil, turning the heap every two weeks.'
  },
  {
    authorName: 'Suresh Yadav', authorLocation: 'Hisar, Haryana', language: 'en', category: 'irrigation',
    title: 'Water Savings with Drip Irrigation',
    content: 'After installing a drip irrigation system I have used about 40% less water on my vegetable plots.'
  }
];

const seedIfEmpty = async () => {
  if ((await Product.count()) === 0) {
    await Product.bulkCreate(sampleProducts);
  }
  if ((await ForumPost.count()) === 0) {
    for (const { comments = [], ...post } of samplePosts) {
      const created = await ForumPost.create(post);
      for (const c of comments) {
        await ForumComment.create({ ...c, postId: created.id });
      }
    }
  }
};

module.exports = { seedIfEmpty };
