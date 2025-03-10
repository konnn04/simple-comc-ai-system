import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert,
    ScrollView,
    Modal,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthUser } from '../utils/useAuthUser';
import { handleLogout, authenticatedFetch } from '../utils/api';
import * as ImagePicker from 'expo-image-picker';
import { HOST } from '../constants/server';

interface UserData {
    avatar: string;
    dob: string;
    email: string;
    fname: string;
    lname: string;
    id: number;
    role: number;
    username: string;
}

export default function UserInfo({ navigation }: any) {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [fname, setFname] = useState('');
    const [lname, setLname] = useState('');
    const [dob, setDob] = useState('');
    const [avatar, setAvatar] = useState('');
    const [imageUploading, setImageUploading] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    const { clearAuthUser, saveAuthUser, authUser } = useAuthUser();

    // Fetch user data when component mounts
    useFocusEffect(
        useCallback(() => {
          fetchUserInfo();
          return () => {
            // This runs when the screen goes out of focus
            // You can clean up anything if needed
          };
        }, [])
      );
    // useEffect(() => {
    //     fetchUserInfo();
    // }, []);

    useEffect(() => {
        if (dob && dob.includes('-')) {
            // Parse standard date format (YYYY-MM-DD)
            const [yearPart, monthPart, dayPart] = dob.split('-');
            setYear(yearPart);
            setMonth(monthPart);
            const day = dayPart.split('T')[0] || dayPart;
            setDay(day);
        } else if (dob) {
            // Try to handle different date formats
            try {
                const dateObj = new Date(dob);
                setYear(dateObj.getFullYear().toString());
                setMonth((dateObj.getMonth() + 1).toString().padStart(2, '0'));
                setDay(dateObj.getDate().toString().padStart(2, '0'));
            } catch (e) {
                console.error('Error parsing date:', e);
            }
        }
    }, [dob]);

    const fetchUserInfo = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch('api/get-user-info', {}, navigation);

            if (!response.ok) {
                throw new Error('Failed to fetch user information');
            }

            const data = await response.json();
            setUserData(data);

            // Initialize form fields with user data
            setUsername(data.username || '');
            setEmail(data.email || '');
            setFname(data.fname || '');
            setLname(data.lname || '');
            setDob(data.dob || '');
            setAvatar(data.avatar || '');

        } catch (error) {
            console.error('Error fetching user info:', error);
            Alert.alert('Error', 'Failed to load user information');
        } finally {
            setLoading(false);
        }
    };

    const toggleEditMode = () => {
        // If cancelling edit, restore all values from userData
        if (editMode && userData) {
            // Reset all form fields to values from userData
            setUsername(userData.username || '');
            setEmail(userData.email || '');
            setFname(userData.fname || '');
            setLname(userData.lname || '');
            setDob(userData.dob || '');
            setAvatar(userData.avatar || '');
            
            // Also reset date components
            if (userData.dob && userData.dob.includes('-')) {
                const [yearPart, monthPart, dayPart] = userData.dob.split('-');
                setYear(yearPart || '');
                setMonth(monthPart || '');
                const day = dayPart?.split('T')[0] || dayPart || '';
                setDay(day);
            } else if (userData.dob) {
                try {
                    const dateObj = new Date(userData.dob);
                    setYear(dateObj.getFullYear().toString());
                    setMonth((dateObj.getMonth() + 1).toString().padStart(2, '0'));
                    setDay(dateObj.getDate().toString().padStart(2, '0'));
                } catch (e) {
                    console.error('Error parsing date during cancel:', e);
                }
            }
        }
        setEditMode(!editMode);
    };

    const handleSetDate = () => {
        if (day && month && year) {
            // Validate date
            const dayNum = parseInt(day, 10);
            const monthNum = parseInt(month, 10);
            const yearNum = parseInt(year, 10);

            if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > new Date().getFullYear()) {
                Alert.alert('Error', 'Invalid date');
                return;
            }

            // Format date as YYYY-MM-DD for API
            const formattedDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
            setDob(formattedDate);
            setShowDatePicker(false);
        } else {
            Alert.alert('Error', 'Please fill all date fields');
        }
    };

    // Format the DOB for display
    const formatDateForDisplay = (dateString: string): string => {
        if (!dateString) return 'Not set';

        try {
            // If already in YYYY-MM-DD format
            if (dateString.includes('-')) {
                const [yearPart, monthPart, dayPart] = dateString.split('-');
                const day = dayPart.split('T')[0] || dayPart; // Remove time part if exists
                return `${yearPart}-${monthPart}-${day}`;
            }

            // Try to parse other formats
            const date = new Date(dateString);
            return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        } catch (e) {
            return dateString;
        }
    };

    const pickImage = async () => {
        try {
            // Request permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow access to your photo library');
                return;
            }
            
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                await uploadAvatar(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const uploadAvatar = async (imageUri: string) => {
        try {
            setImageUploading(true);

            // Create form data
            const formData = new FormData();
            const filename = imageUri.split('/').pop() || 'photo.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            // @ts-ignore
            formData.append('avatar', {
                uri: imageUri,
                name: filename,
                type,
            });

            // Upload the image
            const response = await authenticatedFetch('api/update-avatar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            }, navigation);

            if (!response.ok) {
                throw new Error('Failed to upload avatar');
            }

            const data = await response.json();
            
            // Update local state
            setAvatar(data.avatar);
            
            // Also update userData
            if (userData) {
                setUserData({
                    ...userData,
                    avatar: data.avatar
                });
            }
            
            // Update auth user context to reflect new avatar
            if (authUser) {
                await saveAuthUser({
                    ...authUser,
                    avatar: data.avatar
                });
            }
            
            Alert.alert('Success', 'Avatar updated successfully');
            
        } catch (error) {
            console.error('Error uploading avatar:', error);
            Alert.alert('Error', 'Failed to update avatar');
        } finally {
            setImageUploading(false);
        }
    };

    const handleUpdate = async () => {
        if (!userData) return;

        // Validate inputs
        if (!email.trim() || !fname.trim() || !lname.trim()) {
            Alert.alert('Error', 'Email, first name, and last name are required');
            return;
        }

        try {
            setLoading(true);

            // Format DOB as YYYY-MM-DD
            let formattedDob = dob;
            if (dob && !dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // If not already in the right format, convert it
                formattedDob = formatDateForDisplay(dob);
            }

            const updatedData = {
                'data': {
                    email,
                    fname,
                    lname,
                    username,
                    dob: formattedDob // Send formatted date
                }
            };

            const response = await authenticatedFetch('api/update-info', {
                method: 'POST',
                body: JSON.stringify(updatedData)
            }, navigation);

            if (!response.ok) {
                throw new Error('Failed to update user information');
            }

            const result = await response.json();
            setUserData(result);
            
            // Update auth user context if needed
            if (authUser) {
                await saveAuthUser({
                    ...authUser,
                    fname: result.fname,
                    lname: result.lname,
                });
            }
            
            setEditMode(false);
            Alert.alert('Success', 'Profile updated successfully');

        } catch (error) {
            console.error('Error updating user info:', error);
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const getRoleName = (role: number) => {
        switch (role) {
            case 0: return 'Administrator';
            case 1: return 'Teacher';
            case 2: return 'Student';
            default: return 'User';
        }
    };

    if (loading && !userData) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Loading user information...</Text>
            </View>
        );
    }

    const getAvatarSource = () => {
        if (!avatar) {
            return { uri: '' }; // Return empty URI instead of null
        }
        
        // Check if avatar is a full URL or just a filename
        if (avatar.startsWith('http')) {
            return { uri: avatar };
        } else {
            return { uri: `${HOST}/avatars/${avatar}` };
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>User Profile</Text>
                <TouchableOpacity style={styles.editButton} onPress={toggleEditMode}>
                    <Ionicons
                        name={editMode ? "close-outline" : "create-outline"}
                        size={24}
                        color={editMode ? "#ff6b6b" : "#2196F3"}
                    />
                </TouchableOpacity>
            </View>

            {userData && (
                <View style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <TouchableOpacity 
                            style={styles.avatarContainer}
                            disabled={!editMode}
                            onPress={editMode ? pickImage : undefined}
                        >
                            {avatar ? (
                                <View>
                                    <Image 
                                        source={getAvatarSource()} 
                                        style={styles.avatarImage} 
                                    />
                                    {imageUploading && (
                                        <View style={styles.avatarLoadingOverlay}>
                                            <ActivityIndicator color="#fff" size="small" />
                                        </View>
                                    )}
                                    {editMode && (
                                        <View style={styles.editAvatarOverlay}>
                                            <Ionicons name="camera" size={20} color="#fff" />
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <>
                                    <Text style={styles.avatarText}>
                                        {fname?.charAt(0) || ''}{lname?.charAt(0) || ''}
                                    </Text>
                                    {editMode && (
                                        <View style={styles.editAvatarOverlay}>
                                            <Ionicons name="camera" size={20} color="#fff" />
                                        </View>
                                    )}
                                </>
                            )}
                        </TouchableOpacity>
                        <View style={styles.profileHeaderText}>
                            <Text style={styles.profileName}>{fname} {lname}</Text>
                            {userData.role !== undefined && (
                                <View style={styles.roleBadge}>
                                    <Text style={styles.roleText}>{getRoleName(userData.role)}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.formContainer}>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Username</Text>
                            <TextInput
                                style={[styles.input, !editMode && styles.readOnlyInput]}
                                value={username}
                                onChangeText={setUsername}
                                editable={editMode}
                            />
                        </View>

                        {/* First name and Last name in one row */}
                        <View style={styles.rowInputs}>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>First Name</Text>
                                <TextInput
                                    style={[styles.input, !editMode && styles.readOnlyInput]}
                                    value={fname}
                                    onChangeText={setFname}
                                    editable={editMode}
                                />
                            </View>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.label}>Last Name</Text>
                                <TextInput
                                    style={[styles.input, !editMode && styles.readOnlyInput]}
                                    value={lname}
                                    onChangeText={setLname}
                                    editable={editMode}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={[styles.input, !editMode && styles.readOnlyInput]}
                                value={email}
                                onChangeText={setEmail}
                                editable={editMode}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>


                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Date of Birth</Text>
                            {!editMode ? (
                                <TextInput
                                    style={[styles.input, styles.readOnlyInput]}
                                    value={formatDateForDisplay(dob)}
                                    editable={false}
                                />
                            ) : (
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text>{formatDateForDisplay(dob) || 'Select date of birth'}</Text>
                                </TouchableOpacity>
                            )}

                            {/* Custom Date Picker Modal */}
                            <Modal
                                visible={showDatePicker && editMode}
                                transparent={true}
                                animationType="slide"
                            >
                                <View style={styles.modalContainer}>
                                    <View style={styles.modalContent}>
                                        <Text style={styles.modalTitle}>Select Date of Birth</Text>

                                        <View style={styles.dateInputContainer}>
                                            <View style={styles.dateInputGroup}>
                                                <Text style={styles.dateLabel}>Day</Text>
                                                <TextInput
                                                    style={styles.dateInputField}
                                                    keyboardType="number-pad"
                                                    placeholder="DD"
                                                    maxLength={2}
                                                    value={day}
                                                    onChangeText={setDay}
                                                />
                                            </View>

                                            <View style={styles.dateInputGroup}>
                                                <Text style={styles.dateLabel}>Month</Text>
                                                <TextInput
                                                    style={styles.dateInputField}
                                                    keyboardType="number-pad"
                                                    placeholder="MM"
                                                    maxLength={2}
                                                    value={month}
                                                    onChangeText={setMonth}
                                                />
                                            </View>

                                            <View style={styles.dateInputGroup}>
                                                <Text style={styles.dateLabel}>Year</Text>
                                                <TextInput
                                                    style={styles.dateInputField}
                                                    keyboardType="number-pad"
                                                    placeholder="YYYY"
                                                    maxLength={4}
                                                    value={year}
                                                    onChangeText={setYear}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.modalButtonContainer}>
                                            <TouchableOpacity
                                                style={[styles.modalButton, styles.cancelButton]}
                                                onPress={() => setShowDatePicker(false)}
                                            >
                                                <Text style={styles.modalButtonText}>Cancel</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.modalButton, styles.confirmButton]}
                                                onPress={handleSetDate}
                                            >
                                                <Text style={styles.modalButtonText}>Confirm</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </Modal>
                        </View>
                    </View>

                    {editMode && (
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleUpdate}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => handleLogout(navigation)}
            >
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    editButton: {
        padding: 10,
    },
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#2196F3',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden',
    },
    avatarImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    avatarLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editAvatarOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileHeaderText: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    roleBadge: {
        backgroundColor: '#e3f2fd',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    roleText: {
        color: '#1976d2',
        fontWeight: '500',
        fontSize: 12,
    },
    formContainer: {
        marginBottom: 15,
    },
    formGroup: {
        marginBottom: 15,
    },
    rowInputs: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfWidth: {
        width: '48%',
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        color: '#666',
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        fontSize: 16,
    },
    readOnlyInput: {
        backgroundColor: '#f9f9f9',
        borderColor: '#eee',
        color: '#666',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        borderRadius: 5,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    logoutButton: {
        backgroundColor: '#ff6b6b',
        paddingVertical: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    logoutText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
    // Date picker styles
    dateInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        fontSize: 16,
        justifyContent: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '80%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    dateInputContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    dateInputGroup: {
        width: '30%',
    },
    dateLabel: {
        fontSize: 14,
        marginBottom: 5,
        textAlign: 'center',
    },
    dateInputField: {
        borderWidth: 1,
        borderColor: '#ced4da',
        borderRadius: 5,
        padding: 10,
        textAlign: 'center',
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        padding: 10,
        borderRadius: 5,
        width: '48%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    confirmButton: {
        backgroundColor: '#007bff',
    },
    modalButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});