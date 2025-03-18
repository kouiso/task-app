import { Box, Container } from '@mui/material';
import Image from 'next/image';

const Home = () => (
  <Box sx={{ width: '100%', p: 3 }}>
    <Container
      maxWidth="lg"
      sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}
    >
      <Image src="https://nextjs.org/icons/next.svg" alt="Next.js logo" width={180} height={38} priority />
    </Container>
  </Box>
);

export default Home;
