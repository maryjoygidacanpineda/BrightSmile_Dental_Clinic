import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import {
  addDoctor, createAppointment, deleteAppointment, deleteDoctor,
  getAllDoctors, getAppointments, getAvailability, getDoctors, login, registerPatient,
  updateAppointmentStatus, updateDoctorActive
} from './src/db';

const C = {
  navy:'#153B5B', blue:'#1976A8', pale:'#EAF4FA', bg:'#F4F8FC',
  white:'#FFFFFF', text:'#183247', muted:'#6D8191', green:'#21865B',
  red:'#C34B4B', border:'#DCE7EF', orange:'#B97822'
};
const shifts = ['Morning','Afternoon','Night'];
const times = (start,end) => {
  const out=[]; let [h,m]=start.split(':').map(Number); const [eh,em]=end.split(':').map(Number);
  while(h*60+m < eh*60+em) {
    out.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    m+=30; if(m>=60){h++;m=0;}
  }
  return out;
};
const displayTime = t => {
  if(!t) return '';
  const [h,m]=t.split(':').map(Number); const suffix=h>=12?'PM':'AM';
  return `${String((h%12)||12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${suffix}`;
};
const todayISO = () => {
  const d=new Date(); const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
};

function Button({title,onPress,kind='primary',small=false,disabled=false}) {
  return <TouchableOpacity disabled={disabled} onPress={onPress}
    style={[styles.button,kind==='secondary'&&styles.secondaryButton,kind==='danger'&&styles.dangerButton,
      kind==='ghost'&&styles.ghostButton,small&&styles.smallButton,disabled&&{opacity:.45}]}>
    <Text style={[styles.buttonText,kind!=='primary'&&kind!=='danger'&&styles.secondaryText,small&&{fontSize:12}]}>{title}</Text>
  </TouchableOpacity>;
}
function Field({label,value,onChangeText,placeholder,secureTextEntry,keyboardType,multiline}) {
  return <View style={styles.fieldWrap}>
    <Text style={styles.label}>{label}</Text>
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder||label}
      placeholderTextColor="#91A2AF" secureTextEntry={secureTextEntry} keyboardType={keyboardType}
      multiline={multiline} style={[styles.input,multiline&&{height:88,textAlignVertical:'top'}]}/>
  </View>;
}
function Select({label,value,options,onChange}) {
  return <View style={styles.fieldWrap}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.optionWrap}>
      {options.map(opt=><TouchableOpacity key={String(opt.value)} onPress={()=>onChange(opt.value)}
        style={[styles.option,value===opt.value&&styles.optionActive]}>
        <Text style={[styles.optionText,value===opt.value&&styles.optionTextActive]}>{opt.label}</Text>
      </TouchableOpacity>)}
    </View>
  </View>;
}
function Header({title,subtitle,onBack,onLogout}) {
  return <View style={styles.header}>
    <View style={{flex:1}}>
      {onBack ? <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>:null}
      <Text style={styles.headerTitle}>{title}</Text>
      {!!subtitle&&<Text style={styles.headerSub}>{subtitle}</Text>}
    </View>
    {onLogout&&<TouchableOpacity onPress={onLogout} style={styles.logout}><Text style={styles.logoutText}>Log out</Text></TouchableOpacity>}
  </View>;
}
function Status({status}) {
  const color=status==='Completed'?C.green:status==='Cancelled'?C.red:C.blue;
  return <View style={[styles.status,{backgroundColor:color+'18'}]}><Text style={{color,fontWeight:'800',fontSize:11}}>{status}</Text></View>;
}
function Card({children}) { return <View style={styles.card}>{children}</View>; }

export default function App() {
  const [ready,setReady]=useState(false);
  const [user,setUser]=useState(null);
  const [page,setPage]=useState('login');
  const [refresh,setRefresh]=useState(0);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{ (async()=>{try { const {getDB}=require('./src/db'); await getDB(); } catch(e){Alert.alert('Database error',e.message);} finally{setReady(true);} })(); },[]);
  const reload=()=>setRefresh(v=>v+1);
  const logout=()=>{setUser(null);setPage('login');};
  if(!ready) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={C.blue}/><Text style={styles.muted}>Preparing local database…</Text></SafeAreaView>;
  return <SafeAreaView style={styles.safe}>
    <ExpoStatusBar style="dark"/>
    {page==='login'&&!user&&<LoginScreen onLogin={u=>{setUser(u);setPage('home');}} onSignup={()=>setPage('signup')} setLoading={setLoading} loading={loading}/>}
    {page==='signup'&&!user&&<SignupScreen onBack={()=>setPage('login')} onDone={u=>{setUser(u);setPage('home');}}/>}
    {user&&page==='home'&&<HomeScreen user={user} onLogout={logout} onNavigate={setPage}/>}
    {user&&user.role==='admin'&&page==='doctors'&&<AdminDoctors user={user} onBack={()=>setPage('home')} onLogout={logout} refresh={refresh} reload={reload}/>}
    {user&&user.role==='admin'&&page==='adminAppointments'&&<AdminAppointments user={user} onBack={()=>setPage('home')} onLogout={logout} refresh={refresh} reload={reload}/>}
    {user&&user.role==='admin'&&page==='availability'&&<AvailabilityScreen onBack={()=>setPage('home')} onLogout={logout}/>}
    {user&&user.role==='doctor'&&page==='doctorAppointments'&&<DoctorAppointments user={user} onBack={()=>setPage('home')} onLogout={logout} refresh={refresh} reload={reload}/>}
    {user&&user.role==='patient'&&page==='booking'&&<BookingScreen user={user} onBack={()=>setPage('home')} onLogout={logout} reload={reload}/>}
    {user&&user.role==='patient'&&page==='myAppointments'&&<PatientAppointments user={user} onBack={()=>setPage('home')} onLogout={logout} refresh={refresh} reload={reload}/>}
  </SafeAreaView>;
}

function LoginScreen({onLogin,onSignup,setLoading,loading}) {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [role,setRole]=useState('Patient'); const [menuOpen,setMenuOpen]=useState(false);
  const submit=async()=>{if(!email.trim()||!password){Alert.alert('Missing details','Enter your email and password.');return;}
    setLoading(true); try {const u=await login(email,password); if(!u){Alert.alert('Login failed','Email or password is incorrect.');return;}
      if(u.role!==role.toLowerCase()){Alert.alert('Wrong account type',`This account is registered as ${u.role}. Choose the correct account type.`);return;}
      onLogin(u);}
    catch(e){Alert.alert('Login error',e.message);} finally{setLoading(false);}
  };
  return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.flex}>
    <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
      <View style={styles.loginTopRow}>
        <View style={styles.brandRow}><View style={styles.logoSmall}><Text style={styles.logoIconSmall}>✦</Text></View><View><Text style={styles.brandLeft}>BrightSmile</Text><Text style={styles.brandSubLeft}>DENTAL CLINIC</Text></View></View>
        <View style={{position:'relative',zIndex:10}}>
          <TouchableOpacity style={styles.accountButton} onPress={()=>setMenuOpen(v=>!v)}><Text style={styles.accountButtonText}>Account</Text><Text style={styles.accountArrow}>{menuOpen?'⌃':'⌄'}</Text></TouchableOpacity>
          {menuOpen&&<View style={styles.accountMenu}>{['Patient','Doctor','Admin'].map(item=><TouchableOpacity key={item} style={styles.accountOption} onPress={()=>{setRole(item);setMenuOpen(false);}}><Text style={[styles.accountOptionText,role===item&&{color:C.blue,fontWeight:'900'}]}>{item}</Text></TouchableOpacity>)}</View>}
        </View>
      </View>
      <Text style={styles.welcomeCenter}>Welcome!</Text><Text style={styles.tagline}>Your Smile, Our Priority.</Text>
      <Image source={require('./assets/clinic-banner.jpg')} style={styles.clinicBanner} resizeMode="cover" />
      <Text style={styles.clinicTitle}>BrightSmile Dental Clinic</Text><Text style={styles.clinicSubtitle}>Book your dental appointment with ease.</Text>
      <View style={styles.loginFormCard}>
        <Text style={styles.selectedRole}>Sign in as {role}</Text>
        <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address"/>
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry/>
        <Button title={loading?'Signing in…':'Sign in'} onPress={submit} disabled={loading}/>
        {role==='Patient'&&<Button title="Create patient account" kind="secondary" onPress={onSignup}/>}
      </View>
      <Card><Text style={styles.cardTitle}>Demo accounts</Text>
        <Text style={styles.demo}>Admin: admin@brightsmile.com / admin123</Text>
        <Text style={styles.demo}>Doctor 1: maria@brightsmile.com / doctor123</Text>
        <Text style={styles.demo}>Doctor 2: john@brightsmile.com / doctor123</Text>
        <Text style={styles.demo}>Doctor 3: angela@brightsmile.com / doctor123</Text>
        <Text style={styles.hint}>Choose the account type from the top-right Account menu.</Text>
      </Card>
      <Text style={styles.footer}>Your smile, our priority.</Text>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function SignupScreen({onBack,onDone}) {
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [address,setAddress]=useState(''); const [sex,setSex]=useState('Female'); const [age,setAge]=useState('');
  const submit=async()=>{if(!name.trim()||!email.trim()||password.length<6||!address.trim()||!age.trim()){Alert.alert('Check your details','Complete all fields. Password must be at least 6 characters.');return;}
    try{const u=await registerPatient({name,email,password,address,sex,age});onDone(u);}catch(e){Alert.alert('Sign up failed',e.message);}
  };
  return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.flex}>
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Header title="Create account" subtitle="Patient registration" onBack={onBack}/>
      <Field label="Full name" value={name} onChangeText={setName}/>
      <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address"/>
      <Field label="Password (at least 6 characters)" value={password} onChangeText={setPassword} secureTextEntry/>
      <Field label="Address / Location" value={address} onChangeText={setAddress}/>
      <Select label="Sex" value={sex} onChange={setSex} options={[{label:'Female',value:'Female'},{label:'Male',value:'Male'},{label:'Prefer not to say',value:'Prefer not to say'}]}/>
      <Field label="Age" value={age} onChangeText={setAge} keyboardType="number-pad"/>
      <Button title="Create patient account" onPress={submit}/>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function HomeScreen({user,onLogout,onNavigate}) {
  const roleName=user.role==='admin'?'Clinic Owner / Admin':user.role==='doctor'?'Doctor':'Patient';
  return <ScrollView contentContainerStyle={styles.screen}>
    <Header title="BrightSmile" subtitle={roleName} onLogout={onLogout}/>
    <View style={styles.hero}><Text style={styles.heroEyebrow}>DENTAL CARE, MADE SIMPLE</Text><Text style={styles.heroTitle}>Hello, {user.name.split(' ')[0]}!</Text>
      <Text style={styles.heroText}>Manage appointments and keep every smile on schedule.</Text></View>
    {user.role==='admin'&&<>
      <Text style={styles.sectionTitle}>Clinic management</Text>
      <MenuCard icon="◫" title="All appointments" desc="View and update every patient booking" onPress={()=>onNavigate('adminAppointments')}/>
      <MenuCard icon="♙" title="Manage doctors" desc="Add, view, deactivate or remove dentists" onPress={()=>onNavigate('doctors')}/>
      <MenuCard icon="▦" title="Date availability" desc="Check which dentist time slots are open" onPress={()=>onNavigate('availability')}/>
    </>}
    {user.role==='doctor'&&<>
      <Text style={styles.sectionTitle}>My work</Text>
      <MenuCard icon="▤" title="My appointments" desc="See assigned patients and update status" onPress={()=>onNavigate('doctorAppointments')}/>
    </>}
    {user.role==='patient'&&<>
      <Text style={styles.sectionTitle}>Patient services</Text>
      <MenuCard icon="＋" title="Book an appointment" desc="Choose your dentist, date and available time" onPress={()=>onNavigate('booking')}/>
      <MenuCard icon="▤" title="My appointments" desc="Track bookings and cancel scheduled visits" onPress={()=>onNavigate('myAppointments')}/>
    </>}
    <Card><Text style={styles.cardTitle}>Clinic hours</Text><Text style={styles.body}>Morning · 8:00 AM–12:00 PM</Text><Text style={styles.body}>Afternoon · 1:00 PM–5:00 PM</Text><Text style={styles.body}>Night · 6:00 PM–9:00 PM</Text></Card>
    <Text style={styles.footer}>BrightSmile Dental Clinic · Demo project</Text>
  </ScrollView>;
}
function MenuCard({icon,title,desc,onPress}) {
  return <TouchableOpacity onPress={onPress} style={styles.menuCard}><View style={styles.menuIcon}><Text style={{fontSize:23,color:C.blue}}>{icon}</Text></View>
    <View style={{flex:1}}><Text style={styles.menuTitle}>{title}</Text><Text style={styles.menuDesc}>{desc}</Text></View><Text style={styles.chevron}>›</Text></TouchableOpacity>;
}

function AdminDoctors({onBack,onLogout,reload}) {
  const [doctors,setDoctors]=useState([]); const [name,setName]=useState(''); const [email,setEmail]=useState('');
  const [password,setPassword]=useState('doctor123'); const [specialization,setSpecialization]=useState('General Dentist');
  const [shift,setShift]=useState('Morning');
  const load=async()=>setDoctors(await getAllDoctors());
  useEffect(()=>{load();},[]);
  const add=async()=>{if(!name.trim()||!email.trim()||password.length<6){Alert.alert('Missing details','Enter doctor name, email and a password with at least 6 characters.');return;}
    try{await addDoctor({name,email,password,specialization,shift});setName('');setEmail('');await load();reload();Alert.alert('Doctor added','The doctor account and shift have been created.');}
    catch(e){Alert.alert('Could not add doctor',e.message);}
  };
  const remove=(d)=>Alert.alert('Remove doctor',`Remove ${d.name}?`,[{text:'Keep',style:'cancel'},{text:'Remove',style:'destructive',onPress:async()=>{try{await deleteDoctor(d.id);await load();reload();}catch(e){Alert.alert('Cannot remove',e.message);}}}]);
  const toggle=async d=>{await updateDoctorActive(d.id,!d.active);await load();reload();};
  return <ScrollView contentContainerStyle={styles.screen}>
    <Header title="Manage doctors" subtitle="Add and manage dentist accounts" onBack={onBack} onLogout={onLogout}/>
    <Card><Text style={styles.cardTitle}>Add a dentist</Text>
      <Field label="Doctor full name" value={name} onChangeText={setName}/>
      <Field label="Doctor email" value={email} onChangeText={setEmail} keyboardType="email-address"/>
      <Field label="Temporary password" value={password} onChangeText={setPassword} secureTextEntry/>
      <Field label="Specialization" value={specialization} onChangeText={setSpecialization}/>
      <Select label="Assigned shift" value={shift} onChange={setShift} options={shifts.map(s=>({label:s,value:s}))}/>
      <Text style={styles.hint}>Morning 8 AM–12 PM · Afternoon 1 PM–5 PM · Night 6 PM–9 PM</Text>
      <Button title="Add doctor" onPress={add}/>
    </Card>
    <Text style={styles.sectionTitle}>Current doctors ({doctors.length})</Text>
    {doctors.map(d=><Card key={d.id}><View style={styles.rowBetween}><View style={{flex:1}}><Text style={styles.cardTitle}>{d.name}</Text><Text style={styles.body}>{d.specialization}</Text><Text style={styles.muted}>{d.shift} · {displayTime(d.start_time)}–{displayTime(d.end_time)}</Text><Text style={styles.muted}>Login: {d.user_id ? 'Doctor account created' : 'No linked account'}</Text></View>
      <View style={{gap:6}}><Status status={d.active?'Available':'Inactive'}/><Button title={d.active?'Deactivate':'Activate'} kind="secondary" small onPress={()=>toggle(d)}/><Button title="Delete" kind="danger" small onPress={()=>remove(d)}/></View></View></Card>)}
  </ScrollView>;
}

function AppointmentCard({item,actions,showPatient=true,showDoctor=true}) {
  return <Card>
    <View style={styles.rowBetween}><Text style={styles.reference}>{item.reference_no}</Text><Status status={item.status}/></View>
    {showPatient&&<Text style={styles.cardTitle}>{item.patient_name}</Text>}
    {showDoctor&&<Text style={styles.body}>Dentist: {item.doctor_name}</Text>}
    <Text style={styles.body}>Date: {item.appointment_date} · {displayTime(item.appointment_time)}</Text>
    {showPatient&&<Text style={styles.muted}>Address: {item.patient_address||'Not provided'} · Age: {item.patient_age||'—'}</Text>}
    <Text style={styles.body}>Concern: {item.concern}</Text>
    {!!item.doctor_notes&&<Text style={styles.muted}>Doctor notes: {item.doctor_notes}</Text>}
    {actions&&<View style={styles.actionRow}>{actions}</View>}
  </Card>;
}

function AdminAppointments({onBack,onLogout,reload}) {
  const [items,setItems]=useState([]); const [filter,setFilter]=useState('All');
  const load=async()=>setItems(await getAppointments({}));
  useEffect(()=>{load();},[]);
  const change=async(item,status)=>{try{await updateAppointmentStatus(item.id,status,item.doctor_notes||'');await load();reload();}catch(e){Alert.alert('Update failed',e.message);}};
  const visible=items.filter(i=>filter==='All'||i.status===filter);
  return <View style={styles.flex}><View style={styles.screen}>
    <Header title="All appointments" subtitle={`${items.length} total bookings`} onBack={onBack} onLogout={onLogout}/>
    <Select label="Filter by status" value={filter} onChange={setFilter} options={['All','Scheduled','Completed','Cancelled'].map(x=>({label:x,value:x}))}/>
    <FlatList data={visible} keyExtractor={i=>String(i.id)} contentContainerStyle={{paddingBottom:30}}
      ListEmptyComponent={<Text style={styles.muted}>No appointments found.</Text>}
      renderItem={({item})=><AppointmentCard item={item} actions={<>
        {item.status==='Scheduled'&&<><Button title="Complete" small kind="secondary" onPress={()=>change(item,'Completed')}/><Button title="Cancel" small kind="danger" onPress={()=>change(item,'Cancelled')}/></>}
      </>}/>}/>
  </View></View>;
}

function DoctorAppointments({user,onBack,onLogout,reload}) {
  const [items,setItems]=useState([]); const [notes,setNotes]=useState({});
  const load=async()=>setItems(await getAppointments({role:'doctor',userId:user.id}));
  useEffect(()=>{load();},[]);
  const change=async(item,status)=>{try{await updateAppointmentStatus(item.id,status,notes[item.id]??item.doctor_notes??'');await load();reload();}catch(e){Alert.alert('Update failed',e.message);}};
  return <View style={styles.flex}><View style={styles.screen}>
    <Header title="My appointments" subtitle="Patients assigned to your schedule" onBack={onBack} onLogout={onLogout}/>
    <FlatList data={items} keyExtractor={i=>String(i.id)} contentContainerStyle={{paddingBottom:30}}
      ListEmptyComponent={<Text style={styles.muted}>No appointments assigned yet.</Text>}
      renderItem={({item})=><View><AppointmentCard item={item} showDoctor={false}/>
        {item.status==='Scheduled'&&<Card><Field label="Appointment notes (optional)" value={notes[item.id]??item.doctor_notes??''} onChangeText={v=>setNotes(p=>({...p,[item.id]:v}))} multiline/>
          <View style={styles.actionRow}><Button title="Mark completed" small kind="secondary" onPress={()=>change(item,'Completed')}/><Button title="Cancel" small kind="danger" onPress={()=>change(item,'Cancelled')}/></View>
        </Card>}</View>}/>
  </View></View>;
}

function BookingScreen({user,onBack,onLogout,reload}) {
  const [doctors,setDoctors]=useState([]); const [doctorId,setDoctorId]=useState(null);
  const [date,setDate]=useState(todayISO()); const [time,setTime]=useState(''); const [concern,setConcern]=useState('');
  const [availability,setAvailability]=useState([]); const [busy,setBusy]=useState(false);
  const load=async()=>{const ds=await getDoctors();setDoctors(ds);if(!doctorId&&ds.length)setDoctorId(ds[0].id);};
  useEffect(()=>{load();},[]);
  useEffect(()=>{(async()=>{try{setAvailability(await getAvailability(date));}catch(e){}})();},[date]);
  const doctor=doctors.find(d=>d.id===doctorId);
  const chosen=availability.find(d=>d.id===doctorId);
  const slots=chosen?.slots||[];
  const book=async()=>{if(!doctorId||!date||!time||!concern.trim()){Alert.alert('Complete the form','Choose a doctor, date, available time and enter your concern.');return;}
    setBusy(true);try{const ref=await createAppointment({patientId:user.id,doctorId,date,time,concern});setTime('');setConcern('');reload();Alert.alert('Booking submitted',`Your booking reference is ${ref}. Status: Scheduled.`);setAvailability(await getAvailability(date));}
    catch(e){Alert.alert('Booking unavailable',e.message);setAvailability(await getAvailability(date));}finally{setBusy(false);}
  };
  return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.flex}>
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Header title="Book appointment" subtitle="Choose your dentist and open time slot" onBack={onBack} onLogout={onLogout}/>
      <Card><Text style={styles.cardTitle}>Your details</Text><Text style={styles.body}>{user.name}</Text><Text style={styles.muted}>{user.address} · {user.sex} · {user.age} years old</Text></Card>
      <Text style={styles.sectionTitle}>1. Select a dentist</Text>
      {doctors.map(d=><TouchableOpacity key={d.id} onPress={()=>{setDoctorId(d.id);setTime('');}} style={[styles.doctorChoice,doctorId===d.id&&styles.doctorChoiceActive]}>
        <View style={{flex:1}}><Text style={styles.menuTitle}>{d.name}</Text><Text style={styles.menuDesc}>{d.specialization} · {d.shift} ({displayTime(d.start_time)}–{displayTime(d.end_time)})</Text></View>
        <Text style={{color:doctorId===d.id?C.blue:C.muted,fontWeight:'800'}}>{doctorId===d.id?'✓ Selected':'Select'}</Text>
      </TouchableOpacity>)}
      <Text style={styles.sectionTitle}>2. Choose appointment date</Text>
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={v=>{setDate(v);setTime('');}} placeholder="2026-11-02"/>
      <Text style={styles.hint}>Use YYYY-MM-DD format. Past dates are not accepted.</Text>
      <Text style={styles.sectionTitle}>3. Choose an available time</Text>
      {doctor&&<Text style={styles.muted}>{doctor.shift} shift · {displayTime(doctor.start_time)}–{displayTime(doctor.end_time)}</Text>}
      <View style={styles.slotGrid}>{slots.map(s=><TouchableOpacity key={s.time} disabled={!s.available} onPress={()=>setTime(s.time)}
        style={[styles.slot,s.available?styles.slotOpen:styles.slotClosed,time===s.time&&styles.slotSelected]}>
        <Text style={[styles.slotText,!s.available&&{color:'#A0AAB2'},time===s.time&&{color:C.white}]}>{displayTime(s.time)}</Text>
        <Text style={[styles.slotSub,!s.available&&{color:'#A0AAB2'},time===s.time&&{color:'#EAF4FA'}]}>{s.available?'Available':'Booked'}</Text>
      </TouchableOpacity>)}</View>
      <Text style={styles.sectionTitle}>4. Your dental concern</Text>
      <Field label="Tell the dentist why you need an appointment" value={concern} onChangeText={setConcern} multiline placeholder="Example: toothache, cleaning, consultation…"/>
      <Button title={busy?'Booking…':'Confirm booking'} onPress={book} disabled={busy}/>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function PatientAppointments({user,onBack,onLogout,reload}) {
  const [items,setItems]=useState([]);
  const load=async()=>setItems(await getAppointments({role:'patient',userId:user.id}));
  useEffect(()=>{load();},[]);
  const cancel=item=>Alert.alert('Cancel appointment',`Cancel booking ${item.reference_no}?`,[{text:'Keep',style:'cancel'},{text:'Cancel booking',style:'destructive',onPress:async()=>{try{await deleteAppointment(item.id,user.id);await load();reload();Alert.alert('Cancelled','The time slot is available again.');}catch(e){Alert.alert('Cannot cancel',e.message);}}}]);
  return <View style={styles.flex}><View style={styles.screen}>
    <Header title="My appointments" subtitle="Your booking history" onBack={onBack} onLogout={onLogout}/>
    <FlatList data={items} keyExtractor={i=>String(i.id)} contentContainerStyle={{paddingBottom:30}}
      ListEmptyComponent={<Text style={styles.muted}>You have no appointments yet.</Text>}
      renderItem={({item})=><AppointmentCard item={item} showPatient={false} actions={item.status==='Scheduled'?<Button title="Cancel appointment" small kind="danger" onPress={()=>cancel(item)}/>:null}/>}/>
  </View></View>;
}

function AvailabilityScreen({onBack,onLogout}) {
  const [date,setDate]=useState(todayISO()); const [data,setData]=useState([]);
  const load=async()=>{try{setData(await getAvailability(date));}catch(e){Alert.alert('Availability error',e.message);}};
  useEffect(()=>{load();},[date]);
  return <ScrollView contentContainerStyle={styles.screen}>
    <Header title="Date availability" subtitle="Check open and booked dentist slots" onBack={onBack} onLogout={onLogout}/>
    <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate}/>
    <Text style={styles.hint}>A slot is unavailable only for the same dentist, date and time. Other dentists remain bookable.</Text>
    {data.map(d=><Card key={d.id}><Text style={styles.cardTitle}>{d.name}</Text><Text style={styles.muted}>{d.shift} · {displayTime(d.start_time)}–{displayTime(d.end_time)}</Text>
      <View style={styles.slotGrid}>{d.slots.map(s=><View key={s.time} style={[styles.slot,s.available?styles.slotOpen:styles.slotClosed]}>
        <Text style={[styles.slotText,!s.available&&{color:'#A0AAB2'}]}>{displayTime(s.time)}</Text>
        <Text style={[styles.slotSub,!s.available&&{color:'#A0AAB2'}]}>{s.available?'Available':'Booked'}</Text>
      </View>)}</View>
    </Card>)}
  </ScrollView>;
}

const styles=StyleSheet.create({
  loginTopRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:26,zIndex:5},
  brandRow:{flexDirection:'row',alignItems:'center',gap:9},logoSmall:{width:42,height:42,borderRadius:14,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'},
  logoIconSmall:{fontSize:25,color:C.blue},brandLeft:{fontSize:22,fontWeight:'900',color:C.navy},brandSubLeft:{fontSize:9,fontWeight:'900',letterSpacing:2,color:C.blue},
  accountButton:{flexDirection:'row',alignItems:'center',gap:9,paddingVertical:10,paddingHorizontal:15,borderRadius:22,backgroundColor:'#D9EFFB',borderWidth:1,borderColor:'#A9D8F2'},
  accountButtonText:{color:C.navy,fontWeight:'800',fontSize:13},accountArrow:{color:C.navy,fontSize:18,fontWeight:'900'},
  accountMenu:{position:'absolute',top:46,right:0,width:130,backgroundColor:C.white,borderRadius:13,borderWidth:1,borderColor:C.border,elevation:8,shadowColor:'#000',shadowOpacity:.15,shadowRadius:9,shadowOffset:{width:0,height:4},overflow:'hidden'},
  accountOption:{paddingVertical:12,paddingHorizontal:15,borderBottomWidth:1,borderBottomColor:C.border},accountOptionText:{fontSize:14,color:C.text,fontWeight:'700'},
  welcomeCenter:{fontSize:34,fontWeight:'900',color:C.navy,textAlign:'center',marginTop:4},tagline:{fontSize:16,color:C.muted,textAlign:'center',marginBottom:20},
  clinicBanner:{width:'100%',height:190,borderRadius:18,marginBottom:18},clinicTitle:{fontSize:23,fontWeight:'900',color:C.navy,textAlign:'center'},
  clinicSubtitle:{fontSize:13,color:C.muted,textAlign:'center',marginTop:5,marginBottom:18},loginFormCard:{backgroundColor:C.white,borderRadius:16,padding:15,borderWidth:1,borderColor:C.border,marginBottom:12},
  selectedRole:{fontSize:16,fontWeight:'900',color:C.navy},
  safe:{flex:1,backgroundColor:C.bg},flex:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center',gap:12,backgroundColor:C.bg},
  screen:{padding:18,paddingBottom:36},loginContent:{padding:22,paddingTop:38,paddingBottom:40},
  logo:{width:64,height:64,borderRadius:22,backgroundColor:C.pale,alignItems:'center',justifyContent:'center',alignSelf:'center',marginBottom:12},
  logoIcon:{fontSize:34,color:C.blue},brand:{fontSize:30,fontWeight:'900',color:C.navy,textAlign:'center',letterSpacing:-1},
  brandSub:{fontSize:10,fontWeight:'800',letterSpacing:2,color:C.blue,textAlign:'center',marginTop:3,marginBottom:30},
  welcome:{fontSize:24,fontWeight:'800',color:C.text,marginBottom:4},muted:{fontSize:13,color:C.muted,lineHeight:19},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},
  headerTitle:{fontSize:25,fontWeight:'900',color:C.navy},headerSub:{fontSize:13,color:C.muted,marginTop:3},
  back:{color:C.blue,fontWeight:'800',fontSize:14,marginBottom:5},logout:{paddingVertical:9,paddingHorizontal:12,backgroundColor:C.pale,borderRadius:10},
  logoutText:{color:C.blue,fontWeight:'800',fontSize:12},hero:{backgroundColor:C.navy,borderRadius:20,padding:22,marginBottom:22},
  heroEyebrow:{fontSize:10,color:'#A9D8F2',fontWeight:'900',letterSpacing:1.5},heroTitle:{fontSize:28,color:C.white,fontWeight:'900',marginTop:9},
  heroText:{fontSize:13,color:'#D5E8F4',marginTop:5,lineHeight:20},sectionTitle:{fontSize:17,fontWeight:'900',color:C.navy,marginTop:14,marginBottom:10},
  card:{backgroundColor:C.white,borderRadius:16,padding:15,marginBottom:12,borderWidth:1,borderColor:C.border},
  cardTitle:{fontSize:16,fontWeight:'800',color:C.text,marginBottom:5},body:{fontSize:13,color:C.text,lineHeight:20},
  demo:{fontSize:12,color:C.text,marginTop:4},hint:{fontSize:11,color:C.muted,lineHeight:17,marginTop:5,marginBottom:10},
  footer:{fontSize:11,color:C.muted,textAlign:'center',marginTop:18,marginBottom:12},
  fieldWrap:{marginTop:12},label:{fontSize:12,fontWeight:'800',color:C.text,marginBottom:7},
  input:{borderWidth:1,borderColor:C.border,borderRadius:11,paddingHorizontal:13,paddingVertical:12,fontSize:14,color:C.text,backgroundColor:'#FBFDFF'},
  button:{backgroundColor:C.blue,borderRadius:11,paddingVertical:14,paddingHorizontal:15,alignItems:'center',justifyContent:'center',marginTop:12},
  buttonText:{color:C.white,fontSize:14,fontWeight:'800'},secondaryButton:{backgroundColor:C.pale,borderWidth:1,borderColor:'#C9E0EF'},
  secondaryText:{color:C.blue},dangerButton:{backgroundColor:'#FCEEEE'},ghostButton:{backgroundColor:'transparent'},
  smallButton:{paddingVertical:8,paddingHorizontal:10,marginTop:0},rowBetween:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  field:{},optionWrap:{flexDirection:'row',flexWrap:'wrap',gap:7},option:{borderWidth:1,borderColor:C.border,borderRadius:10,paddingVertical:9,paddingHorizontal:12,backgroundColor:C.white},
  optionActive:{backgroundColor:C.pale,borderColor:C.blue},optionText:{fontSize:12,color:C.text,fontWeight:'700'},optionTextActive:{color:C.blue},
  menuCard:{flexDirection:'row',alignItems:'center',gap:13,padding:15,backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:15,marginBottom:10},
  menuIcon:{width:44,height:44,borderRadius:13,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'},
  menuTitle:{fontSize:15,fontWeight:'800',color:C.text},menuDesc:{fontSize:12,color:C.muted,marginTop:3,lineHeight:17},chevron:{fontSize:28,color:C.blue},
  status:{paddingVertical:5,paddingHorizontal:9,borderRadius:20},reference:{fontSize:12,fontWeight:'900',color:C.blue},
  actionRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:10},doctorChoice:{flexDirection:'row',alignItems:'center',gap:8,padding:13,borderRadius:13,borderWidth:1,borderColor:C.border,backgroundColor:C.white,marginBottom:8},
  doctorChoiceActive:{borderColor:C.blue,backgroundColor:C.pale},slotGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:10},
  slot:{width:'30.5%',minHeight:57,borderRadius:10,borderWidth:1,padding:8,alignItems:'center',justifyContent:'center'},
  slotOpen:{backgroundColor:'#F0FAF5',borderColor:'#B8E1CB'},slotClosed:{backgroundColor:'#F3F5F7',borderColor:'#E0E5E9'},
  slotSelected:{backgroundColor:C.blue,borderColor:C.blue},slotText:{fontSize:12,fontWeight:'800',color:C.text},slotSub:{fontSize:10,color:C.green,marginTop:3,fontWeight:'700'}
});
