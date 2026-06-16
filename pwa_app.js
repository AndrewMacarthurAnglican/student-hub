const e = React.createElement;
const { useState, useEffect, useRef } = React;

const PRIORITIES = ["High","Medium","Low"];
const P_DOT = {High:"#E24B4A",Medium:"#EF9F27",Low:"#639922"};
const SUBJECT_COLORS = ["#378ADD","#639922","#E24B4A","#EF9F27","#9B59B6","#1D9E75","#D85A30","#185FA5"];

function fmt(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;return h>0?`${h}h ${String(m).padStart(2,"0")}m`:`${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`;}
function isToday(d){if(!d)return false;return new Date(d).toDateString()===new Date().toDateString();}
function isThisWeek(d){if(!d)return false;const now=new Date(),day=now.getDay();const mon=new Date(now);mon.setDate(now.getDate()-(day||7)+1);mon.setHours(0,0,0,0);const sun=new Date(mon);sun.setDate(mon.getDate()+6);sun.setHours(23,59,59,999);return new Date(d)>=mon&&new Date(d)<=sun;}
function daysUntil(d){if(!d)return null;return Math.ceil((new Date(d)-new Date())/86400000);}
function todayKey(){return new Date().toISOString().slice(0,10);}
function ls(k,v){if(v===undefined){try{const r=localStorage.getItem("sh_"+k);return r?JSON.parse(r):null;}catch(_){return null;}}try{localStorage.setItem("sh_"+k,JSON.stringify(v));}catch(_){}}

const dark=window.matchMedia&&window.matchMedia("(prefers-color-scheme:dark)").matches;
const C={bg:dark?"#111":"#fff",bg2:dark?"#1e1e1e":"#f5f5f7",border:dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)",text:dark?"#f0f0f0":"#1a1a1a",text2:dark?"#888":"#666",text3:dark?"#555":"#999"};

function App(){
  const [view,setView]=useState("tasks");
  const [tasks,setTasks]=useState(()=>ls("tasks")||[]);
  const [subjects,setSubjects]=useState(()=>ls("subjects")||[]);
  const [grades,setGrades]=useState(()=>ls("grades")||[]);
  const [exams,setExams]=useState(()=>ls("exams")||[]);
  const [streak,setStreak]=useState(()=>ls("streak")||{days:0,lastStudied:null,goal:120,todaySecs:0});
  const [pomo,setPomo]=useState(()=>ls("pomo")||{mode:"work",work:25,shortBreak:5,longBreak:15,count:0});
  const [activeTimer,setActiveTimer]=useState(()=>ls("activeTimer")||null);
  const [tick,setTick]=useState(0);
  const [taskView,setTaskView]=useState("today");
  const [adding,setAdding]=useState(false);
  const [nt,setNt]=useState({title:"",dueDate:"",priority:"Medium",subject:""});
  const [ns,setNs]=useState({name:"",color:SUBJECT_COLORS[0]});
  const [addingS,setAddingS]=useState(false);
  const [ng,setNg]=useState({subject:"",assignment:"",score:"",total:"100"});
  const [addingG,setAddingG]=useState(false);
  const [nx,setNx]=useState({subject:"",title:"",date:"",notes:""});
  const [addingX,setAddingX]=useState(false);
  const [pomoRunning,setPomoRunning]=useState(false);
  const [pomoSecs,setPomoSecs]=useState(()=>{const p=ls("pomo");return p?p.work*60:25*60;});
  const pomoRef=useRef(null);
  const timerRef=useRef(null);

  useEffect(()=>{ls("tasks",tasks);},[tasks]);
  useEffect(()=>{ls("subjects",subjects);},[subjects]);
  useEffect(()=>{ls("grades",grades);},[grades]);
  useEffect(()=>{ls("exams",exams);},[exams]);
  useEffect(()=>{ls("streak",streak);},[streak]);
  useEffect(()=>{ls("pomo",pomo);},[pomo]);
  useEffect(()=>{ls("activeTimer",activeTimer);},[activeTimer]);

  useEffect(()=>{
    if(activeTimer){timerRef.current=setInterval(()=>{setTick(t=>t+1);setStreak(s=>({...s,todaySecs:s.todaySecs+1}));},1000);}
    else clearInterval(timerRef.current);
    return()=>clearInterval(timerRef.current);
  },[activeTimer]);

  useEffect(()=>{
    if(pomoRunning){
      pomoRef.current=setInterval(()=>{
        setPomoSecs(s=>{
          if(s<=1){clearInterval(pomoRef.current);setPomoRunning(false);
            setPomo(p=>{const cnt=p.mode==="work"?p.count+1:p.count;const next=p.mode==="work"?(cnt%4===0?"longBreak":"shortBreak"):"work";const ns=next==="work"?p.work*60:next==="shortBreak"?p.shortBreak*60:p.longBreak*60;setPomoSecs(ns);return{...p,mode:next,count:cnt};});return 0;}
          if(pomo.mode==="work")setStreak(s=>({...s,todaySecs:s.todaySecs+1}));
          return s-1;
        });
      },1000);
    } else clearInterval(pomoRef.current);
    return()=>clearInterval(pomoRef.current);
  },[pomoRunning]);

  function getLive(id){const t=tasks.find(t=>t.id===id);const base=t?.loggedSeconds||0;if(activeTimer?.taskId===id)return base+Math.floor((Date.now()-activeTimer.startedAt)/1000);return base;}
  function startTimer(id){if(activeTimer)stopTimer(activeTimer.taskId);setActiveTimer({taskId:id,startedAt:Date.now()});}
  function stopTimer(id){if(!activeTimer||activeTimer.taskId!==id)return;const el=Math.floor((Date.now()-activeTimer.startedAt)/1000);setTasks(p=>p.map(t=>t.id===id?{...t,loggedSeconds:(t.loggedSeconds||0)+el}:t));setActiveTimer(null);}
  function toggleDone(id){if(activeTimer?.taskId===id)stopTimer(id);setTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t));updateStreak();}
  function deleteTask(id){if(activeTimer?.taskId===id)setActiveTimer(null);setTasks(p=>p.filter(t=>t.id!==id));}
  function updateStreak(){const today=todayKey();setStreak(s=>{if(s.lastStudied===today)return s;const y=new Date();y.setDate(y.getDate()-1);const yk=y.toISOString().slice(0,10);return{...s,days:s.lastStudied===yk?s.days+1:1,lastStudied:today};});}
  function addTask(){if(!nt.title.trim())return;setTasks(p=>[{id:Date.now(),title:nt.title.trim(),dueDate:nt.dueDate,priority:nt.priority,subject:nt.subject,done:false,loggedSeconds:0,createdAt:new Date().toISOString()},...p]);setNt({title:"",dueDate:"",priority:"Medium",subject:""});setAdding(false);}
  function addSubject(){if(!ns.name.trim())return;setSubjects(p=>[...p,{id:Date.now(),name:ns.name.trim(),color:ns.color}]);setNs({name:"",color:SUBJECT_COLORS[(subjects.length+1)%SUBJECT_COLORS.length]});setAddingS(false);}
  function addGrade(){if(!ng.subject||!ng.assignment||!ng.score)return;setGrades(p=>[...p,{id:Date.now(),...ng,score:parseFloat(ng.score),total:parseFloat(ng.total),date:new Date().toISOString()}]);setNg({subject:"",assignment:"",score:"",total:"100"});setAddingG(false);}
  function addExam(){if(!nx.title||!nx.date)return;setExams(p=>[...p,{id:Date.now(),...nx}]);setNx({subject:"",title:"",date:"",notes:""});setAddingX(false);}
  function subjectColor(name){return subjects.find(s=>s.name===name)?.color||"#888";}
  function avgGrade(){if(!grades.length)return null;return(grades.reduce((a,g)=>a+(g.score/g.total*100),0)/grades.length).toFixed(1);}

  const filteredTasks=tasks.filter(t=>taskView==="today"?(isToday(t.dueDate)||(!t.dueDate&&!t.done)):taskView==="week"?(isThisWeek(t.dueDate)||!t.dueDate):true);
  const upcomingExams=exams.filter(x=>daysUntil(x.date)>=0).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const goalPct=Math.min(100,Math.round(streak.todaySecs/(streak.goal*60)*100));
  const pomoTotal=pomo.mode==="work"?pomo.work*60:pomo.mode==="shortBreak"?pomo.shortBreak*60:pomo.longBreak*60;
  const pomoPct=(1-pomoSecs/pomoTotal)*100;
  const pomoDisplay=`${String(Math.floor(pomoSecs/60)).padStart(2,"0")}:${String(pomoSecs%60).padStart(2,"0")}`;

  const inp={fontSize:14,border:`0.5px solid ${C.border}`,borderRadius:8,padding:"7px 11px",background:C.bg2,color:C.text,outline:"none",boxSizing:"border-box"};
  const card={background:C.bg,borderRadius:14,border:`0.5px solid ${C.border}`,overflow:"hidden",marginBottom:12};
  const blueBtn={padding:"7px 16px",borderRadius:9,border:"none",background:"#378ADD",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"};
  const ghostBtn={padding:"7px 14px",borderRadius:9,border:`0.5px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:13,cursor:"pointer"};
  const st={fontSize:11,fontWeight:600,color:C.text3,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:10};
  const views=["tasks","pomodoro","grades","exams","streak"];
  const vIcons={tasks:"✓",pomodoro:"◎",grades:"★",exams:"⚑",streak:"⚡"};
  const vLabels={tasks:"Tasks",pomodoro:"Focus",grades:"Grades",exams:"Exams",streak:"Streak"};

  return e("div",{style:{color:C.text}},
    // Header
    e("div",{style:{marginBottom:"1.25rem"}},
      e("div",{style:{fontSize:26,fontWeight:700,letterSpacing:"-0.5px",color:C.text}},"Student Hub"),
      e("div",{style:{fontSize:13,color:C.text2,marginTop:2}},new Date().toLocaleDateString("en-AU",{weekday:"long",month:"long",day:"numeric"}))
    ),
    // Stats
    e("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:"1.25rem"}},
      ...[{l:"Tasks left",v:tasks.filter(t=>!t.done).length,c:"#378ADD",b:"rgba(55,138,221,0.09)"},
          {l:"Today",v:fmt(streak.todaySecs),c:"#639922",b:"rgba(99,153,34,0.09)"},
          {l:"Avg grade",v:avgGrade()?`${avgGrade()}%`:"—",c:"#9B59B6",b:"rgba(155,89,182,0.09)"},
          {l:"Streak",v:`${streak.days}d`,c:"#E24B4A",b:"rgba(226,75,74,0.09)"},
         ].map(x=>e("div",{key:x.l,style:{background:x.b,borderRadius:12,padding:"10px 12px"}},
           e("div",{style:{fontSize:10,fontWeight:600,color:x.c,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:3}},x.l),
           e("div",{key:tick,style:{fontSize:18,fontWeight:700,color:x.c,letterSpacing:"-0.5px"}},x.v)
         ))
    ),
    // Nav
    e("div",{style:{display:"flex",marginBottom:"1.25rem",background:C.bg2,borderRadius:12,padding:3}},
      ...views.map(v=>e("button",{key:v,onClick:()=>setView(v),style:{flex:1,padding:"7px 4px",borderRadius:9,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,background:view===v?C.bg:"transparent",color:view===v?C.text:C.text2,boxShadow:view===v?"0 1px 3px rgba(0,0,0,0.1)":"none"}},`${vIcons[v]} ${vLabels[v]}`))
    ),

    // TASKS
    view==="tasks"&&e("div",null,
      e("div",{style:{display:"flex",marginBottom:10,background:C.bg2,borderRadius:9,padding:2,width:"fit-content"}},
        ...[["today","Today"],["week","Week"],["all","All"]].map(([v,l])=>e("button",{key:v,onClick:()=>setTaskView(v),style:{padding:"5px 14px",borderRadius:7,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,background:taskView===v?C.bg:"transparent",color:taskView===v?C.text:C.text2}},l))
      ),
      e("div",{style:card},
        filteredTasks.length===0?e("div",{style:{padding:"1.5rem",textAlign:"center",color:C.text3,fontSize:14}},"No tasks · add one below"):
        filteredTasks.map((task,i)=>{
          const isActive=activeTimer?.taskId===task.id,secs=getLive(task.id),sc=task.subject?subjectColor(task.subject):null;
          return e("div",{key:task.id,style:{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderBottom:i<filteredTasks.length-1?`0.5px solid ${C.border}`:"none",background:C.bg}},
            e("button",{onClick:()=>toggleDone(task.id),style:{width:20,height:20,borderRadius:"50%",border:`2px solid ${task.done?"#639922":P_DOT[task.priority]}`,background:task.done?"#639922":"transparent",flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}},
              task.done&&e("svg",{width:10,height:7,viewBox:"0 0 10 7",fill:"none"},e("path",{d:"M1 3.5l2.5 2.5 5.5-5.5",stroke:"#fff",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"}))
            ),
            e("div",{style:{flex:1,minWidth:0}},
              e("div",{style:{fontSize:14,fontWeight:500,color:task.done?C.text3:C.text,textDecoration:task.done?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}},task.title),
              e("div",{style:{display:"flex",gap:6,alignItems:"center",marginTop:2,flexWrap:"wrap"}},
                sc&&e("span",{style:{fontSize:11,fontWeight:600,color:sc,background:sc+"18",borderRadius:5,padding:"1px 6px"}},task.subject),
                e("span",{style:{width:5,height:5,borderRadius:"50%",background:P_DOT[task.priority],display:"inline-block"}}),
                e("span",{style:{fontSize:11,color:C.text3}},task.priority),
                task.dueDate&&e("span",{style:{fontSize:11,color:C.text3}},"· "+new Date(task.dueDate).toLocaleDateString("en-AU",{month:"short",day:"numeric"})),
                (secs>0||isActive)&&e("span",{key:tick,style:{fontSize:11,color:isActive?"#378ADD":C.text3,fontWeight:isActive?600:400}},(isActive?"● ":"")+fmt(secs))
              )
            ),
            !task.done&&e("button",{onClick:()=>isActive?stopTimer(task.id):startTimer(task.id),style:{padding:"4px 10px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:isActive?"rgba(226,75,74,0.1)":"rgba(55,138,221,0.1)",color:isActive?"#E24B4A":"#378ADD",flexShrink:0}},isActive?"Stop":"Start"),
            e("button",{onClick:()=>deleteTask(task.id),style:{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:18,lineHeight:1,padding:"0 2px"}},"×")
          );
        })
      ),
      !adding?e("button",{onClick:()=>setAdding(true),style:{display:"flex",alignItems:"center",gap:8,padding:"11px 14px",width:"100%",borderRadius:14,border:`0.5px solid ${C.border}`,background:C.bg,cursor:"pointer",color:"#378ADD",fontSize:14,fontWeight:500,boxSizing:"border-box"}},e("span",{style:{fontSize:18}},"+")," New task"):
      e("div",{style:{...card,padding:14}},
        e("input",{autoFocus:true,value:nt.title,onChange:ev=>setNt(p=>({...p,title:ev.target.value})),onKeyDown:ev=>ev.key==="Enter"&&addTask(),placeholder:"Task name",style:{...inp,width:"100%",marginBottom:10,fontSize:15,fontWeight:500,background:"transparent",border:"none",borderBottom:`0.5px solid ${C.border}`,borderRadius:0,padding:"4px 0"}}),
        e("div",{style:{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}},
          e("input",{type:"date",value:nt.dueDate,onChange:ev=>setNt(p=>({...p,dueDate:ev.target.value})),style:inp}),
          e("select",{value:nt.priority,onChange:ev=>setNt(p=>({...p,priority:ev.target.value})),style:inp},...PRIORITIES.map(p=>e("option",{key:p},p))),
          e("select",{value:nt.subject,onChange:ev=>setNt(p=>({...p,subject:ev.target.value})),style:inp},e("option",{value:""},"No subject"),...subjects.map(s=>e("option",{key:s.id},s.name))),
          e("div",{style:{marginLeft:"auto",display:"flex",gap:6}},
            e("button",{onClick:()=>{setAdding(false);setNt({title:"",dueDate:"",priority:"Medium",subject:""});},style:ghostBtn},"Cancel"),
            e("button",{onClick:addTask,style:blueBtn},"Add")
          )
        )
      ),
      e("div",{style:{marginTop:20}},
        e("div",{style:st},"Subjects"),
        e("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}},
          ...subjects.map(s=>e("span",{key:s.id,style:{fontSize:12,fontWeight:600,color:s.color,background:s.color+"18",borderRadius:7,padding:"4px 12px",display:"flex",alignItems:"center",gap:6}},
            s.name,e("span",{onClick:()=>setSubjects(p=>p.filter(x=>x.id!==s.id)),style:{cursor:"pointer",opacity:0.5,fontSize:14}},"×")
          )),
          !addingS&&e("button",{onClick:()=>setAddingS(true),style:{fontSize:12,fontWeight:600,color:"#378ADD",background:"rgba(55,138,221,0.09)",borderRadius:7,padding:"4px 12px",border:"none",cursor:"pointer"}},"+ Add subject")
        ),
        addingS&&e("div",{style:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}},
          e("input",{value:ns.name,onChange:ev=>setNs(p=>({...p,name:ev.target.value})),placeholder:"Subject name",style:{...inp,flex:1},onKeyDown:ev=>ev.key==="Enter"&&addSubject()}),
          e("div",{style:{display:"flex",gap:4}},...SUBJECT_COLORS.map(c=>e("div",{key:c,onClick:()=>setNs(p=>({...p,color:c})),style:{width:18,height:18,borderRadius:"50%",background:c,cursor:"pointer",border:ns.color===c?`2px solid ${C.text}`:"2px solid transparent"}}))),
          e("button",{onClick:addSubject,style:blueBtn},"Add"),
          e("button",{onClick:()=>setAddingS(false),style:ghostBtn},"Cancel")
        )
      )
    ),

    // POMODORO
    view==="pomodoro"&&e("div",{style:{textAlign:"center"}},
      e("div",{style:{position:"relative",width:200,height:200,margin:"0 auto 1.5rem"}},
        e("svg",{width:200,height:200,style:{transform:"rotate(-90deg)"}},
          e("circle",{cx:100,cy:100,r:88,fill:"none",stroke:C.border,strokeWidth:8}),
          e("circle",{cx:100,cy:100,r:88,fill:"none",stroke:pomo.mode==="work"?"#378ADD":pomo.mode==="shortBreak"?"#639922":"#9B59B6",strokeWidth:8,strokeLinecap:"round",strokeDasharray:`${2*Math.PI*88}`,strokeDashoffset:`${2*Math.PI*88*(1-pomoPct/100)}`,style:{transition:"stroke-dashoffset 1s linear"}})
        ),
        e("div",{style:{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}},
          e("div",{style:{fontSize:36,fontWeight:700,letterSpacing:"-1px",color:C.text}},pomoDisplay),
          e("div",{style:{fontSize:12,color:C.text2,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.5px"}},pomo.mode==="work"?"Focus":pomo.mode==="shortBreak"?"Short break":"Long break")
        )
      ),
      e("div",{style:{display:"flex",justifyContent:"center",gap:10,marginBottom:"1.5rem"}},
        e("button",{onClick:()=>{setPomoRunning(r=>!r);if(!pomoRunning)updateStreak();},style:{...blueBtn,padding:"10px 28px",fontSize:15}},pomoRunning?"Pause":"Start"),
        e("button",{onClick:()=>{setPomoRunning(false);setPomoSecs(pomo.mode==="work"?pomo.work*60:pomo.mode==="shortBreak"?pomo.shortBreak*60:pomo.longBreak*60);},style:{...ghostBtn,padding:"10px 18px",fontSize:15}},"Reset")
      ),
      e("div",{style:{display:"flex",justifyContent:"center",gap:6,marginBottom:"1.5rem"}},
        ...["work","shortBreak","longBreak"].map(m=>e("button",{key:m,onClick:()=>{setPomoRunning(false);setPomo(p=>({...p,mode:m}));setPomoSecs(m==="work"?pomo.work*60:m==="shortBreak"?pomo.shortBreak*60:pomo.longBreak*60);},style:{padding:"5px 12px",borderRadius:8,border:`0.5px solid ${C.border}`,background:pomo.mode===m?C.bg2:"transparent",color:pomo.mode===m?C.text:C.text2,fontSize:12,cursor:"pointer",fontWeight:pomo.mode===m?600:400}},m==="work"?"Focus":m==="shortBreak"?"Short":"Long"))
      ),
      e("div",{style:{...card,padding:"14px",textAlign:"left"}},
        e("div",{style:st},"Timer settings"),
        ...[["work","Focus (min)"],["shortBreak","Short break"],["longBreak","Long break"]].map(([k,l])=>
          e("div",{key:k,style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}},
            e("span",{style:{fontSize:14,color:C.text2}},l),
            e("div",{style:{display:"flex",alignItems:"center",gap:8}},
              e("button",{onClick:()=>setPomo(p=>({...p,[k]:Math.max(1,p[k]-1)})),style:{...ghostBtn,padding:"3px 10px"}},"−"),
              e("span",{style:{fontSize:14,fontWeight:600,minWidth:24,textAlign:"center",color:C.text}},pomo[k]),
              e("button",{onClick:()=>setPomo(p=>({...p,[k]:p[k]+1})),style:{...ghostBtn,padding:"3px 10px"}},"+")
            )
          )
        ),
        e("div",{style:{fontSize:12,color:C.text3,marginTop:4}},"Sessions completed: "+pomo.count)
      )
    ),

    // GRADES
    view==="grades"&&e("div",null,
      e("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}},
        e("div",{style:{background:"rgba(155,89,182,0.09)",borderRadius:12,padding:"12px 14px"}},e("div",{style:{fontSize:11,fontWeight:600,color:"#9B59B6",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}},"Average"),e("div",{style:{fontSize:28,fontWeight:700,color:"#9B59B6"}},avgGrade()?`${avgGrade()}%`:"—")),
        e("div",{style:{background:"rgba(55,138,221,0.09)",borderRadius:12,padding:"12px 14px"}},e("div",{style:{fontSize:11,fontWeight:600,color:"#378ADD",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}},"Assignments"),e("div",{style:{fontSize:28,fontWeight:700,color:"#378ADD"}},grades.length))
      ),
      subjects.length===0&&e("div",{style:{color:C.text3,fontSize:13,marginBottom:10}},"Add subjects in the Tasks tab first."),
      ...subjects.map(sub=>{
        const sg=grades.filter(g=>g.subject===sub.name);if(!sg.length)return null;
        const avg=(sg.reduce((a,g)=>a+(g.score/g.total*100),0)/sg.length).toFixed(1);
        return e("div",{key:sub.id,style:card},
          e("div",{style:{padding:"10px 14px",borderBottom:`0.5px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.bg}},
            e("span",{style:{fontSize:13,fontWeight:600,color:sub.color}},sub.name),
            e("span",{style:{fontSize:13,fontWeight:700,color:sub.color}},avg+"%")
          ),
          ...sg.map((g,i)=>e("div",{key:g.id,style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:i<sg.length-1?`0.5px solid ${C.border}`:"none",background:C.bg}},
            e("span",{style:{fontSize:13,color:C.text}},g.assignment),
            e("div",{style:{display:"flex",alignItems:"center",gap:10}},
              e("span",{style:{fontSize:13,fontWeight:600,color:(g.score/g.total*100)>=70?"#639922":(g.score/g.total*100)>=50?"#EF9F27":"#E24B4A"}},(g.score/g.total*100).toFixed(0)+"%"),
              e("span",{style:{fontSize:12,color:C.text3}},g.score+"/"+g.total),
              e("button",{onClick:()=>setGrades(p=>p.filter(x=>x.id!==g.id)),style:{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:16}},"×")
            )
          ))
        );
      }),
      !addingG?e("button",{onClick:()=>setAddingG(true),style:{display:"flex",alignItems:"center",gap:8,padding:"11px 14px",width:"100%",borderRadius:14,border:`0.5px solid ${C.border}`,background:C.bg,cursor:"pointer",color:"#9B59B6",fontSize:14,fontWeight:500,boxSizing:"border-box"}},e("span",{style:{fontSize:18}},"+")," Log a grade"):
      e("div",{style:{...card,padding:14}},
        e("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}},
          e("select",{value:ng.subject,onChange:ev=>setNg(p=>({...p,subject:ev.target.value})),style:{...inp,width:"100%"}},e("option",{value:""},"Subject"),...subjects.map(s=>e("option",{key:s.id},s.name))),
          e("input",{value:ng.assignment,onChange:ev=>setNg(p=>({...p,assignment:ev.target.value})),placeholder:"Assignment name",style:{...inp,width:"100%"}}),
          e("input",{type:"number",value:ng.score,onChange:ev=>setNg(p=>({...p,score:ev.target.value})),placeholder:"Score",style:{...inp,width:"100%"}}),
          e("input",{type:"number",value:ng.total,onChange:ev=>setNg(p=>({...p,total:ev.target.value})),placeholder:"Out of",style:{...inp,width:"100%"}})
        ),
        e("div",{style:{display:"flex",gap:8,justifyContent:"flex-end"}},
          e("button",{onClick:()=>setAddingG(false),style:ghostBtn},"Cancel"),
          e("button",{onClick:addGrade,style:{...blueBtn,background:"#9B59B6"}},"Save")
        )
      )
    ),

    // EXAMS
    view==="exams"&&e("div",null,
      upcomingExams.length===0&&e("div",{style:{...card,padding:"1.5rem",textAlign:"center",color:C.text3,fontSize:14}},"No upcoming exams · add one below"),
      ...upcomingExams.map(exam=>{
        const days=daysUntil(exam.date),col=days<=3?"#E24B4A":days<=7?"#EF9F27":"#378ADD",sc=exam.subject?subjectColor(exam.subject):col;
        return e("div",{key:exam.id,style:{...card,marginBottom:10}},
          e("div",{style:{padding:"12px 14px",background:C.bg}},
            e("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}},
              e("div",null,
                exam.subject&&e("span",{style:{fontSize:11,fontWeight:600,color:sc,background:sc+"18",borderRadius:5,padding:"1px 7px",marginBottom:6,display:"inline-block"}},exam.subject),
                e("div",{style:{fontSize:15,fontWeight:600,color:C.text,marginTop:exam.subject?4:0}},exam.title),
                e("div",{style:{fontSize:12,color:C.text2,marginTop:3}},new Date(exam.date).toLocaleDateString("en-AU",{weekday:"long",month:"long",day:"numeric"})),
                exam.notes&&e("div",{style:{fontSize:12,color:C.text3,marginTop:4}},exam.notes)
              ),
              e("div",{style:{textAlign:"right",flexShrink:0,marginLeft:12}},
                e("div",{style:{fontSize:22,fontWeight:700,color:col}},days===0?"Today":days===1?"Tomorrow":`${days}d`),
                e("div",{style:{fontSize:11,color:C.text3}},"until exam"),
                e("button",{onClick:()=>setExams(p=>p.filter(x=>x.id!==exam.id)),style:{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:16,marginTop:4}},"×")
              )
            ),
            e("div",{style:{marginTop:10,height:4,background:C.bg2,borderRadius:4,overflow:"hidden"}},
              e("div",{style:{height:"100%",background:col,borderRadius:4,width:`${Math.max(4,100-Math.min(100,(days/30)*100))}%`}})
            )
          )
        );
      }),
      !addingX?e("button",{onClick:()=>setAddingX(true),style:{display:"flex",alignItems:"center",gap:8,padding:"11px 14px",width:"100%",borderRadius:14,border:`0.5px solid ${C.border}`,background:C.bg,cursor:"pointer",color:"#E24B4A",fontSize:14,fontWeight:500,boxSizing:"border-box"}},e("span",{style:{fontSize:18}},"+")," Add exam / deadline"):
      e("div",{style:{...card,padding:14}},
        e("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}},
          e("input",{value:nx.title,onChange:ev=>setNx(p=>({...p,title:ev.target.value})),placeholder:"Exam / deadline title",style:{...inp,width:"100%",gridColumn:"1/-1"}}),
          e("select",{value:nx.subject,onChange:ev=>setNx(p=>({...p,subject:ev.target.value})),style:{...inp,width:"100%"}},e("option",{value:""},"Subject (optional)"),...subjects.map(s=>e("option",{key:s.id},s.name))),
          e("input",{type:"date",value:nx.date,onChange:ev=>setNx(p=>({...p,date:ev.target.value})),style:{...inp,width:"100%"}}),
          e("input",{value:nx.notes,onChange:ev=>setNx(p=>({...p,notes:ev.target.value})),placeholder:"Notes (optional)",style:{...inp,width:"100%",gridColumn:"1/-1"}})
        ),
        e("div",{style:{display:"flex",gap:8,justifyContent:"flex-end"}},
          e("button",{onClick:()=>setAddingX(false),style:ghostBtn},"Cancel"),
          e("button",{onClick:addExam,style:{...blueBtn,background:"#E24B4A"}},"Save")
        )
      )
    ),

    // STREAK
    view==="streak"&&e("div",null,
      e("div",{style:{...card,padding:"1.25rem",textAlign:"center",marginBottom:12}},
        e("div",{style:{fontSize:48,fontWeight:700,color:"#E24B4A",letterSpacing:"-2px"}},streak.days),
        e("div",{style:{fontSize:14,color:C.text2,fontWeight:500}},"day streak"),
        e("div",{style:{fontSize:12,color:C.text3,marginTop:4}},streak.lastStudied===todayKey()?"Studied today ✓":"Study today to keep your streak!")
      ),
      e("div",{style:{...card,padding:"1.25rem",marginBottom:12}},
        e("div",{style:st},"Today's goal"),
        e("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}},
          e("span",{key:tick,style:{fontSize:14,color:C.text2}},fmt(streak.todaySecs)+" studied"),
          e("span",{style:{fontSize:14,fontWeight:600,color:goalPct>=100?"#639922":C.text}},goalPct+"%")
        ),
        e("div",{style:{height:8,background:C.bg2,borderRadius:6,overflow:"hidden"}},
          e("div",{style:{height:"100%",background:goalPct>=100?"#639922":"#378ADD",borderRadius:6,width:`${goalPct}%`,transition:"width 0.5s"}})
        ),
        e("div",{style:{fontSize:12,color:C.text3,marginTop:8}},"Goal: "+streak.goal+" minutes/day"),
        e("div",{style:{display:"flex",alignItems:"center",gap:10,marginTop:12}},
          e("span",{style:{fontSize:13,color:C.text2}},"Daily goal (min)"),
          e("div",{style:{display:"flex",alignItems:"center",gap:8,marginLeft:"auto"}},
            e("button",{onClick:()=>setStreak(s=>({...s,goal:Math.max(5,s.goal-5)})),style:{...ghostBtn,padding:"3px 10px"}},"−"),
            e("span",{style:{fontSize:14,fontWeight:600,minWidth:30,textAlign:"center",color:C.text}},streak.goal),
            e("button",{onClick:()=>setStreak(s=>({...s,goal:s.goal+5})),style:{...ghostBtn,padding:"3px 10px"}},"+")
          )
        )
      ),
      e("div",{style:{...card,padding:"1.25rem"}},
        e("div",{style:st},"Stats"),
        ...[{l:"Total study time",v:fmt(tasks.reduce((a,t)=>a+t.loggedSeconds,0)+streak.todaySecs)},
            {l:"Tasks completed",v:tasks.filter(t=>t.done).length},
            {l:"Pomodoro sessions",v:pomo.count},
            {l:"Grades logged",v:grades.length},
            {l:"Upcoming exams",v:upcomingExams.length},
           ].map((r,i,arr)=>e("div",{key:r.l,style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<arr.length-1?`0.5px solid ${C.border}`:"none"}},
             e("span",{style:{fontSize:14,color:C.text2}},r.l),
             e("span",{key:tick,style:{fontSize:14,fontWeight:600,color:C.text}},r.v)
           ))
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(e(App));
