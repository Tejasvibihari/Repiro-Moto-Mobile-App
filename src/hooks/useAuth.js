// src/hooks/useAuth.js
import { useDispatch, useSelector } from 'react-redux';
import { login, logout } from '../store/slices/authSlice';

const useAuth = () => {
    const dispatch = useDispatch();
    const { isLoggedIn, user, token } = useSelector((state) => state.auth);

    const signIn = (responseData) => {
        dispatch(login(responseData));
    };

    const signOut = () => {
        dispatch(logout());
    };

    return {
        isLoggedIn,
        user,
        token,
        signIn,
        signOut,
    };
};

export default useAuth;