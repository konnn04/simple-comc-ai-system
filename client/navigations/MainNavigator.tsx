import React, { useEffect, useState } from 'react';
import { BottomNavigation, BottomNavigationAction } from '@mui/material';
import Home from '../components/Home';
import UserInfo from '../components/UserInfo';
import { useAuthUser } from '../utils/useAuthUser';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';


export default function MainNavigator({ navigation }: any) {
  const { checkValidToken } = useAuthUser();
  const [value, setValue] = useState(0);

  useEffect(() => {
    (async () => {
      const isValidToken = await checkValidToken();
      if (!isValidToken) {
        navigation.navigate('Login');
      }
    })();
  }, []);

  const renderScene = () => {
    switch (value) {
      case 0:
        return <Home navigation={navigation} route={{}} />;
      case 1:
        return <UserInfo navigation={navigation} />;
      default:
        return <Home navigation={navigation} route={{}} />;
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
        {renderScene()}
      </div>
      <BottomNavigation
        showLabels
        value={value}
        onChange={(event, newValue) => {
          setValue(newValue);
        }}
        style={{ position: 'fixed', bottom: 0, width: '100%' }}
      >
        <BottomNavigationAction label="Home" icon={<HomeIcon />} />
        <BottomNavigationAction label="User Info" icon={< PersonIcon />} />
      </BottomNavigation>
    </div>
  );
}