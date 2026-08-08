const CFG=window.STORE_CONFIG;
const configured=CFG&&CFG.supabaseUrl&&!CFG.supabaseUrl.includes('PUT_')&&CFG.supabaseAnonKey&&!CFG.supabaseAnonKey.includes('PUT_');
const db=configured?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey):null;
const $=id=>document.getElementById(id);
let categories=[],products=[],cart=[],orders=[],slides=[],slideIndex=0,slideTimer=null,settings={logo_image_url:null},isAdmin=false;

function safe(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
function money(value){return `${Number(value).toFixed(2)} ${CFG.currency||'₪'}`}
function toast(message){$('toast').innerHTML=`<div class="toast">✓ ${safe(message)}</div>`;setTimeout(()=>$('toast').innerHTML='',2600)}
function fail(message){alert(message)}
function initial(){return (CFG.shortName||CFG.storeName||'م').trim().charAt(0)}

function applyBranding(){
  document.documentElement.style.setProperty('--primary',CFG.primaryColor||'#171714');
  document.documentElement.style.setProperty('--accent',CFG.accentColor||'#b49367');
  document.documentElement.style.setProperty('--bg',CFG.backgroundColor||'#f6f3ee');
  document.documentElement.style.setProperty('--hero-bg',CFG.heroBackgroundColor||'#eae3d8');
  document.documentElement.style.setProperty('--card-bg',CFG.cardBackgroundColor||'#ffffff');
  document.documentElement.style.setProperty('--announcement-bg',CFG.announcementColor||CFG.primaryColor||'#171714');
  document.documentElement.style.setProperty('--header-bg',CFG.headerBackgroundColor||CFG.backgroundColor||'#f6f3ee');
  document.title=CFG.storeName;
  $('announcement').textContent=CFG.announcement||'';
  $('storeName').textContent=CFG.storeName;
  $('storeSubtitle').textContent=CFG.heroEyebrow||'';
  $('brandMark').textContent=initial();
  $('footerName').textContent=CFG.storeName;
  $('footerText').textContent=CFG.heroDescription||'';
  $('year').textContent=new Date().getFullYear();
  $('whatsappLink').href=`https://wa.me/${String(CFG.whatsapp||'').replace(/\D/g,'')}`;
  $('adminStoreName').textContent=CFG.storeName;
  $('adminGreeting').textContent=`أهلًا بكِ في ${CFG.storeName}`;
  $('adminMark').textContent=initial();
}

async function boot(){
  applyBranding();
  if(!configured){$('loading').classList.add('hidden');$('setupMessage').classList.remove('hidden');return}
  await Promise.all([loadSettings(),loadSlides(),loadCatalog()]);
  $('loading').classList.add('hidden');
  if(new URLSearchParams(location.search).get('admin')==='1'){await openAdminLogin();return}
  $('publicApp').classList.remove('hidden');
}

async function loadSettings(){
  const {data,error}=await db.from('shop_settings').select('logo_image_url').eq('id',1).maybeSingle();
  if(!error&&data)settings=data;
  renderLogo();
}
function logoMarkup(){return settings.logo_image_url?`<img src="${safe(settings.logo_image_url)}" alt="لوجو ${safe(CFG.storeName)}" onerror="this.remove()">`:safe(initial())}
function renderLogo(){
  $('brandMark').innerHTML=logoMarkup();
  $('adminMark').innerHTML=logoMarkup();
  $('logoPreview').innerHTML=settings.logo_image_url?`<img src="${safe(settings.logo_image_url)}" alt="معاينة اللوجو">`:`<span class="brand-mark">${safe(initial())}</span>`;
}
async function loadSlides(){const {data,error}=await db.from('shop_slides').select('*').eq('is_active',true).order('sort_order').order('created_at');slides=error?[]:(data||[]);renderSlider();renderSlidesAdmin()}
function renderSlider(){clearInterval(slideTimer);if(!slides.length){$('heroMedia').innerHTML=`<div class="hero-placeholder"><span>${safe(initial())}</span><small>أضيفي صور السلايدر من الإدارة</small></div>`;return}slideIndex=Math.min(slideIndex,slides.length-1);$('heroMedia').innerHTML=`<div class="hero-slider">${slides.map((slide,index)=>`<div class="hero-slide ${index===slideIndex?'active':''}"><img src="${safe(slide.image_url)}" alt="واجهة ${safe(CFG.storeName)} ${index+1}"></div>`).join('')}</div>${slides.length>1?`<button class="slider-arrow slider-prev" onclick="previousSlide()" aria-label="السابق">‹</button><button class="slider-arrow slider-next" onclick="nextSlide()" aria-label="التالي">›</button><div class="slider-dots">${slides.map((_,index)=>`<button class="slider-dot ${index===slideIndex?'active':''}" onclick="showSlide(${index})" aria-label="الصورة ${index+1}"></button>`).join('')}</div>`:''}`;if(slides.length>1)slideTimer=setInterval(nextSlide,4500)}
function showSlide(index){if(!slides.length)return;slideIndex=(index+slides.length)%slides.length;document.querySelectorAll('.hero-slide').forEach((el,i)=>el.classList.toggle('active',i===slideIndex));document.querySelectorAll('.slider-dot').forEach((el,i)=>el.classList.toggle('active',i===slideIndex))}
function nextSlide(){showSlide(slideIndex+1)}
function previousSlide(){showSlide(slideIndex-1)}
function renderSlidesAdmin(){if(!$('slidesAdminList'))return;$('slidesAdminList').innerHTML=slides.length?slides.map(slide=>`<article class="slide-admin-card"><img src="${safe(slide.image_url)}" alt="صورة سلايدر"><button class="danger" onclick="deleteSlide('${slide.id}','${safe(slide.image_path||'')}')">حذف</button></article>`).join(''):'<p class="muted">لا توجد صور في السلايدر بعد.</p>'}

async function loadCatalog(){
  const [{data:categoryRows,error:categoryError},{data:productRows,error:productError}]=await Promise.all([
    db.from('shop_categories').select('*').eq('is_active',true).order('sort_order').order('name'),
    db.from('shop_products').select('*,shop_categories(name,discount_percent,discount_active),shop_product_images(*),shop_product_variants(*)').eq('is_active',true).order('created_at',{ascending:false})
  ]);
  if(categoryError||productError){fail('تعذر تحميل بيانات المتجر. تأكدي من تشغيل ملف database-setup.sql.');return}
  categories=categoryRows||[];
  products=(productRows||[]).map(product=>({...product,category:product.shop_categories?.name||'',category_discount_percent:Number(product.shop_categories?.discount_percent)||0,category_discount_active:!!product.shop_categories?.discount_active,images:(product.shop_product_images||[]).sort((a,b)=>a.sort_order-b.sort_order),variants:product.shop_product_variants||[]}));
  renderCategories();renderBestSellers();renderProducts(products);renderAdminData();
}

function renderCategories(){
  $('categoryNav').innerHTML=`<button class="active" onclick="filterCategory('',this)">الكل</button>`+categories.map(category=>`<button onclick="filterCategory('${safe(category.name)}',this)">${safe(category.name)}</button>`).join('');
  $('pCategory').innerHTML=categories.length?categories.map(category=>`<option value="${category.id}">${safe(category.name)}</option>`).join(''):'<option value="">أضيفي قسمًا أولًا</option>';
}
function effectivePrice(product){
  const price=Number(product.price)||0,discount=product.category_discount_active?Math.min(100,Math.max(0,Number(product.category_discount_percent)||0)):0;
  return discount>0?Number((price*(1-discount/100)).toFixed(2)):price;
}
function productCard(product){
  const soldOut=Number(product.stock)<1,hasDiscount=product.category_discount_active&&Number(product.category_discount_percent)>0,finalPrice=effectivePrice(product);
  return `<article class="product ${soldOut?'sold-out':''}"><button class="product-image" onclick="openProduct('${product.id}')">${product.image_url?`<img src="${safe(product.image_url)}" alt="${safe(product.name)}">`:'<span>بدون صورة</span>'}${hasDiscount?`<span class="discount-badge">-${Number(product.category_discount_percent)}%</span>`:''}${Number(product.sold_count)>0?'<span class="best-badge">الأكثر مبيعًا</span>':''}${soldOut?'<span class="sold-badge">SOLD OUT</span>':''}</button><div class="product-info"><small>${safe(product.category)}</small><h3>${safe(product.name)}</h3>${product.short_description?`<p class="product-short">${safe(product.short_description)}</p>`:''}<div class="price"><span class="price-values">${hasDiscount?`<del>${money(product.price)}</del><b>${money(finalPrice)}</b>`:`<b>${money(product.price)}</b>`}</span><button aria-label="اختيار المنتج" ${soldOut?'disabled':''} onclick="openProduct('${product.id}')">${soldOut?'×':'＋'}</button></div></div></article>`;
}
function renderBestSellers(){
  const section=$('bestSellersSection'),grid=$('bestSellerGrid');if(!section||!grid)return;
  const best=[...products].filter(product=>Number(product.sold_count)>0).sort((a,b)=>Number(b.sold_count)-Number(a.sold_count)).slice(0,8);
  section.classList.toggle('hidden',!best.length);grid.innerHTML=best.map(productCard).join('');
}
function renderProducts(list){
  $('productGrid').innerHTML=list.length?list.map(productCard).join(''):'<div class="empty">لا توجد منتجات حاليًا.</div>';
}
function filterCategory(name,button){
  $('productsTitle').textContent=name||'جميع المنتجات';
  document.querySelectorAll('#categoryNav button').forEach(item=>item.classList.toggle('active',item===button));
  renderProducts(name?products.filter(product=>product.category===name):products);
}
$('searchInput').addEventListener('input',event=>{const query=event.target.value.trim();renderProducts(products.filter(product=>product.name.includes(query)||product.category.includes(query)))});

function cartUnits(){return cart.reduce((total,item)=>total+item.quantity,0)}
function cartSubtotal(){return cart.reduce((total,item)=>total+effectivePrice(item.product)*item.quantity,0)}
function deliveryZones(){return Array.isArray(CFG.deliveryZones)&&CFG.deliveryZones.length?CFG.deliveryZones:[{name:'الضفة',price:20},{name:'الداخل',price:70},{name:'القدس',price:35}]}
function phonePrefixes(){return Array.isArray(CFG.phonePrefixes)&&CFG.phonePrefixes.length?CFG.phonePrefixes:['+970','+972']}
function syncCart(){cart=cart.filter(item=>item.quantity>0);$('cartCount').textContent=cartUnits()}
function optionButtons(values,name){return (values||[]).length?`<div class="option-group"><b>${name}</b><div>${values.map((value,index)=>`<label><input type="radio" name="${name}" value="${safe(value)}" ${index===0?'checked':''}><span>${safe(value)}</span></label>`).join('')}</div></div>`:''}
function openProduct(id){const product=products.find(item=>item.id===id);if(!product)return;const images=product.images?.length?product.images:[{image_url:product.image_url}];$('overlay').innerHTML=`<div class="modal" onclick="closeOverlay()"><article class="product-detail" onclick="event.stopPropagation()"><button class="detail-close" onclick="closeOverlay()">×</button><div class="detail-gallery"><img id="detailMainImage" src="${safe(images[0]?.image_url||'')}" alt="${safe(product.name)}"><div class="detail-thumbs">${images.map((image,index)=>`<button onclick="selectDetailImage('${safe(image.image_url)}',this)" class="${index===0?'active':''}"><img src="${safe(image.image_url)}" alt=""></button>`).join('')}</div></div><div class="detail-info"><small>${safe(product.category)}</small><h2>${safe(product.name)}</h2><div class="detail-price">${product.category_discount_active&&Number(product.category_discount_percent)>0?`<del>${money(product.price)}</del><strong>${money(effectivePrice(product))}</strong><span>خصم ${Number(product.category_discount_percent)}%</span>`:`<strong>${money(product.price)}</strong>`}</div>${product.description?`<p>${safe(product.description)}</p>`:''}${optionButtons(product.colors,'اللون')}${optionButtons(product.sizes,'المقاس')}${optionButtons(product.shoe_sizes,'النمرة')}<button class="primary detail-add" ${Number(product.stock)<1?'disabled':''} onclick="addConfiguredProduct('${product.id}')">${Number(product.stock)<1?'SOLD OUT':'إضافة إلى السلة'}</button></div></article></div>`}
function selectDetailImage(url,button){$('detailMainImage').src=url;document.querySelectorAll('.detail-thumbs button').forEach(item=>item.classList.toggle('active',item===button))}
function addConfiguredProduct(id){const product=products.find(item=>item.id===id);if(!product||Number(product.stock)<1)return;const selected=['اللون','المقاس','النمرة'].map(name=>document.querySelector(`input[name="${name}"]:checked`)).filter(Boolean).map(input=>`${input.name}: ${input.value}`).join('، ');const item=cart.find(row=>row.product.id===id&&row.selectedOptions===selected);if(item){if(item.quantity>=Number(product.stock))return toast('وصلتِ إلى الكمية المتوفرة');item.quantity++}else cart.push({product,quantity:1,selectedOptions:selected});syncCart();closeOverlay();toast('تمت الإضافة إلى السلة')}
function addCart(id){openProduct(id)}
function changeQuantity(id,change){const item=cart.find(row=>row.product.id===id);if(!item)return;const next=item.quantity+change;if(next>Number(item.product.stock))return toast('لا توجد كمية إضافية');item.quantity=next;syncCart();openCart()}
function removeCartItemByIndex(index){cart.splice(index,1);syncCart();openCart()}
function openCart(){$('overlay').innerHTML=`<div class="modal" onclick="closeOverlay()"><div class="cart cart-wide" onclick="event.stopPropagation()"><header><div><span class="eyebrow">مراجعة الطلب</span><h2>سلة التسوق</h2></div><button onclick="closeOverlay()">×</button></header>${cart.length?`<div class="cart-lines">${cart.map((item,index)=>`<div class="cart-item"><img src="${safe(item.product.image_url||'')}" alt=""><div class="cart-item-info"><b>${safe(item.product.name)}</b>${item.selectedOptions?`<small>${safe(item.selectedOptions)}</small>`:''}<small>${money(item.product.price)}</small><div class="quantity"><button onclick="changeQuantity('${item.product.id}',1)">＋</button><span>${item.quantity}</span><button onclick="changeQuantity('${item.product.id}',-1)">−</button></div></div><strong>${money(Number(item.product.price)*item.quantity)}</strong><button class="remove-item" onclick="removeCartItemByIndex(${index})">حذف</button></div>`).join('')}</div><div class="cart-summary"><p><span>مجموع المنتجات</span><b>${money(cartSubtotal())}</b></p><p><span>التوصيل</span><b>يُحدد حسب المنطقة</b></p></div><button class="primary checkout-button" onclick="openCheckout()">إكمال الطلب</button>`:'<div class="empty-cart"><p>السلة فارغة.</p><button class="text-button" onclick="closeOverlay()">متابعة التسوق</button></div>'}</div></div>`}
function openCheckout(){if(!cart.length)return;const zones=deliveryZones(),prefixes=phonePrefixes();$('overlay').innerHTML=`<div class="modal"><form class="checkout" onsubmit="submitOrder(event)"><header><div><span class="eyebrow">الخطوة الأخيرة</span><h2>بيانات التوصيل</h2></div><button type="button" onclick="openCart()">×</button></header><div class="checkout-grid"><label>الاسم الأول<input id="customerFirstName" required></label><label>اسم العائلة<input id="customerLastName" required></label><label class="wide">رقم الهاتف مع مقدمة واتساب<div class="phone-field"><select id="customerPhonePrefix">${prefixes.map(prefix=>`<option value="${safe(prefix)}">${safe(prefix)}</option>`).join('')}</select><input id="customerPhone" type="tel" inputmode="numeric" placeholder="592000000" required></div></label><label>منطقة التوصيل<select id="deliveryZone" onchange="updateCheckoutTotal()">${zones.map((zone,index)=>`<option value="${index}">${safe(zone.name)} — ${money(zone.price)}</option>`).join('')}</select></label><label>المدينة<input id="customerCity" required></label><label class="wide">العنوان بالتفصيل<input id="customerAddress" required></label><label class="wide">ملاحظات الطلب<textarea id="customerNotes" rows="3" placeholder="اختياري"></textarea></label></div><div class="cash-payment"><b>الدفع عند الاستلام</b><small>يتم دفع المبلغ عند وصول الطلب</small></div><div class="checkout-breakdown"><p><span>مجموع المنتجات</span><b>${money(cartSubtotal())}</b></p><p><span>سعر التوصيل</span><b id="checkoutDelivery">${money(zones[0].price)}</b></p><p class="checkout-total"><span>الإجمالي</span><b id="checkoutGrandTotal">${money(cartSubtotal()+Number(zones[0].price))}</b></p></div><div id="checkoutError" class="login-error"></div><button class="primary checkout-button">تأكيد الطلب</button></form></div>`}
function selectedDeliveryZone(){const zones=deliveryZones(),index=Math.max(0,Number($('deliveryZone')?.value||0));return zones[index]||zones[0]}
function updateCheckoutTotal(){const zone=selectedDeliveryZone();$('checkoutDelivery').textContent=money(zone.price);$('checkoutGrandTotal').textContent=money(cartSubtotal()+Number(zone.price))}
async function submitOrder(event){event.preventDefault();const button=event.submitter;button.disabled=true;button.textContent='جارٍ تسجيل الطلب...';$('checkoutError').textContent='';try{const zone=selectedDeliveryZone(),finalTotal=cartSubtotal()+Number(zone.price);const firstName=$('customerFirstName').value.trim(),lastName=$('customerLastName').value.trim();const phone=`${$('customerPhonePrefix').value}${$('customerPhone').value.trim().replace(/^0+/,'')}`;const city=`${zone.name} - ${$('customerCity').value.trim()}`;const items=cart.map(item=>({product_id:item.product.id,quantity:item.quantity}));const {data,error}=await db.rpc('create_shop_order',{p_customer_name:`${firstName} ${lastName}`,p_customer_phone:phone,p_customer_city:city,p_customer_address:$('customerAddress').value.trim(),p_customer_notes:$('customerNotes').value.trim(),p_payment_method:'cash',p_delivery_fee:Number(zone.price),p_items:items});if(error)throw error;cart=[];syncCart();await loadCatalog();$('overlay').innerHTML=`<div class="modal"><div class="order-success"><span class="success-icon">✓</span><h2>تم استلام طلبكِ</h2><p>رقم الطلب: <b>#${safe(data.order_number)}</b></p><p>الإجمالي مع توصيل ${safe(zone.name)}: <b>${money(finalTotal)}</b></p><p>سيتم التواصل معكِ على واتساب لتأكيد التوصيل.</p><button class="primary" onclick="closeOverlay()">العودة إلى المتجر</button></div></div>`}catch(error){$('checkoutError').textContent=error.message||'تعذر تسجيل الطلب';button.disabled=false;button.textContent='تأكيد الطلب'}}
function closeOverlay(){$('overlay').innerHTML=''}

async function openAdminLogin(){
  const {data:{session}}=await db.auth.getSession();
  if(session)return verifyAdmin();
  $('overlay').innerHTML=`<div class="modal"><form class="login" onsubmit="login(event)"><span class="brand-mark">${logoMarkup()}</span><h1>${safe(CFG.storeName)}</h1><p>دخول إدارة المتجر</p><label>البريد الإلكتروني<input id="loginEmail" type="email" autocomplete="username" required></label><label>كلمة المرور<input id="loginPassword" type="password" autocomplete="current-password" required></label><div id="loginError" class="login-error"></div><button class="primary">تسجيل الدخول</button><button type="button" class="text-button" onclick="location.href='index.html'">العودة إلى المتجر</button></form></div>`;
}
async function login(event){
  event.preventDefault();$('loginError').textContent='جارٍ التحقق...';
  const email=$('loginEmail').value.trim().toLowerCase();
  if(email!==String(CFG.adminEmail).trim().toLowerCase()){ $('loginError').textContent='هذا البريد غير مخوّل لإدارة المتجر';return }
  const {error}=await db.auth.signInWithPassword({email,password:$('loginPassword').value});
  if(error){$('loginError').textContent='البريد أو كلمة المرور غير صحيحة';return}
  await verifyAdmin();
}
async function verifyAdmin(){
  const {data:{user}}=await db.auth.getUser();
  const {data,error}=await db.from('shop_admins').select('user_id').eq('user_id',user?.id||'').maybeSingle();
  if(error||!data||user.email.toLowerCase()!==String(CFG.adminEmail).toLowerCase()){await db.auth.signOut();fail('هذا الحساب لا يملك صلاحية إدارة المتجر');return}
  isAdmin=true;closeOverlay();$('publicApp').classList.add('hidden');$('adminApp').classList.remove('hidden');adminPage('dashboard');renderAdminData();await loadOrders();
}
function adminPage(page){document.querySelectorAll('.admin-page').forEach(section=>section.classList.add('hidden'));$(page+'Page').classList.remove('hidden');document.querySelectorAll('.sidebar nav button').forEach(button=>button.classList.toggle('active',button.dataset.page===page));document.querySelector('.sidebar').classList.remove('open');if(page==='orders')loadOrders();if(page==='inventory')renderInventory()}
function backToStore(){location.href='index.html'}
async function logout(){await db.auth.signOut();location.reload()}

function renderAdminData(){
  $('statProducts').textContent=products.length;
  $('statCategories').textContent=categories.length;
  $('statStock').textContent=products.reduce((total,product)=>total+Number(product.stock),0);
  $('statLow').textContent=products.filter(product=>Number(product.stock)<=5).length;
  $('adminProducts').innerHTML=products.length?products.map(product=>`<div class="admin-row"><span class="thumb">${product.image_url?`<img src="${safe(product.image_url)}" alt="">`:''}</span><b>${safe(product.name)}<small>${safe(product.category)}</small></b><span>${product.category_discount_active&&Number(product.category_discount_percent)>0?`${money(effectivePrice(product))} <small class="admin-old-price">${money(product.price)}</small>`:money(product.price)}</span><span>المبيعات: ${Number(product.sold_count)||0}</span><span>الكمية: ${product.stock}</span><div class="row-actions"><button class="outline-button" onclick="editProduct('${product.id}')">تعديل</button><button class="danger" onclick="deleteProduct('${product.id}','${safe(product.image_path||'')}')">حذف</button></div></div>`).join(''):'<div class="empty">لا توجد منتجات بعد.</div>';
  $('adminCategories').innerHTML=categories.length?categories.map(category=>`<article class="category-discount-card"><div><b>${safe(category.name)}</b><small>${products.filter(p=>p.category_id===category.id).length} منتج</small></div><label>نسبة الخصم %<input id="catDiscount-${category.id}" type="number" min="0" max="100" step="1" value="${Number(category.discount_percent)||0}"></label><label class="category-discount-toggle"><input id="catActive-${category.id}" type="checkbox" ${category.discount_active?'checked':''}><span>تفعيل الخصم</span></label><button class="primary" onclick="saveCategoryDiscount('${category.id}')">حفظ</button><button class="danger" onclick="deleteCategory('${category.id}','${safe(category.name)}')">حذف</button></article>`).join(''):'<span class="muted">لا توجد أقسام بعد.</span>';
}

const orderStatusLabels={new:'جديد',preparing:'قيد التجهيز',shipped:'تم الشحن',completed:'مكتمل',cancelled:'ملغي'};
const paymentLabels={cash:'الدفع عند الاستلام'};
async function loadOrders(){
  if(!isAdmin)return;
  const {data,error}=await db.from('shop_orders').select('*,shop_order_items(*)').order('created_at',{ascending:false});
  if(error){$('adminOrders').innerHTML='<div class="empty">تعذر تحميل الطلبات.</div>';return}
  orders=data||[];const newCount=orders.filter(order=>order.status==='new').length;$('ordersBadge').textContent=newCount;$('ordersBadge').classList.toggle('hidden',!newCount);
  $('adminOrders').innerHTML=orders.length?orders.map(order=>`<article class="order-card"><header><div><span class="order-number">#${safe(order.order_number)}</span><small>${new Date(order.created_at).toLocaleString('ar')}</small></div><span class="status status-${safe(order.status)}">${orderStatusLabels[order.status]||safe(order.status)}</span></header><div class="order-customer"><b>${safe(order.customer_name)}</b><a href="tel:${safe(order.customer_phone)}">${safe(order.customer_phone)}</a><span>${safe(order.customer_city)}، ${safe(order.customer_address)}</span>${order.notes?`<small>ملاحظة: ${safe(order.notes)}</small>`:''}</div><div class="order-items">${(order.shop_order_items||[]).map(item=>`<div><span>${safe(item.product_name)} × ${item.quantity}</span><b>${money(item.line_total)}</b></div>`).join('')}</div><div class="order-footer"><div><small>${paymentLabels[order.payment_method]||safe(order.payment_method)}</small><strong>${money(order.total)}</strong></div><select onchange="updateOrderStatus('${order.id}',this.value)">${Object.entries(orderStatusLabels).map(([value,label])=>`<option value="${value}" ${order.status===value?'selected':''}>${label}</option>`).join('')}</select></div></article>`).join(''):'<div class="empty">لا توجد طلبات حتى الآن.</div>';
}
async function updateOrderStatus(id,status){const {error}=await db.from('shop_orders').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)return fail(error.message);toast('تم تحديث حالة الطلب');await loadOrders()}

$('productForm').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!categories.length)return fail('أضيفي قسمًا أولًا');
  const button=event.submitter;button.disabled=true;button.textContent='جارٍ الحفظ...';
  try{
    const editingId=$('editingProductId').value,editing=products.find(product=>product.id===editingId),files=Array.from($('pImage').files);if(!editing&& !files.length)throw new Error('اختاري صورة المنتج');if(files.length+(editing?.images?.length||0)>12)throw new Error('الحد الأقصى 12 صورة للمنتج');
    const assignments=[...document.querySelectorAll('.image-color-select')];
    const uploaded=[];for(const [index,file] of files.entries()){validateImage(file,5,'صورة المنتج');const extension=file.name.split('.').pop().toLowerCase();const image_path=`products/${Date.now()}-${crypto.randomUUID()}.${extension}`;const {error:uploadError}=await db.storage.from('shop-images').upload(image_path,file,{contentType:file.type});if(uploadError)throw uploadError;uploaded.push({image_path,image_url:db.storage.from('shop-images').getPublicUrl(image_path).data.publicUrl,sort_order:(editing?.images?.length||0)+index,color:assignments[index]?.value||null})}
    const splitValues=id=>$(id).value.split(/[,،]/).map(value=>value.trim()).filter(Boolean);
    const variantRows=collectVariantRows();const totalStock=variantRows.length?variantRows.reduce((sum,row)=>sum+row.stock,0):Number($('pStock').value);
    const productType=$('pUseNumbers').checked?'shoes':$('pUseSizes').checked?'clothing':'regular';
    const firstImage=editing?.images?.[0]||uploaded[0],payload={category_id:$('pCategory').value,name:$('pName').value.trim(),price:Number($('pPrice').value),stock:totalStock,product_type:productType,short_description:$('pShortDescription').value.trim(),description:$('pDescription').value.trim(),colors:$('pUseColors').checked?splitValues('pColors'):[],sizes:$('pUseSizes').checked?splitValues('pSizesInput'):[],shoe_sizes:$('pUseNumbers').checked?splitValues('pNumbersInput'):[],image_url:firstImage?.image_url||editing?.image_url,image_path:firstImage?.image_path||editing?.image_path};
    let productId=editingId;if(editingId){const {error}=await db.from('shop_products').update(payload).eq('id',editingId);if(error)throw error;const {error:clearError}=await db.from('shop_product_variants').delete().eq('product_id',editingId);if(clearError)throw clearError}else{const {data:created,error}=await db.from('shop_products').insert(payload).select('id').single();if(error)throw error;productId=created.id}
    if(uploaded.length){const {error:imagesError}=await db.from('shop_product_images').insert(uploaded.map(image=>({...image,product_id:productId})));if(imagesError)throw imagesError}
    if(variantRows.length){const {error:variantsError}=await db.from('shop_product_variants').insert(variantRows.map(row=>({...row,product_id:productId})));if(variantsError)throw variantsError}
    cancelProductEdit();await loadCatalog();toast(editingId?'تم تعديل المنتج':'تم حفظ المنتج');
  }catch(error){fail(error.message)}finally{button.disabled=false;button.textContent='حفظ المنتج'}
});
async function deleteProduct(id,imagePath){if(!confirm('هل تريدين حذف هذا المنتج؟'))return;const product=products.find(item=>item.id===id);const paths=(product?.images||[]).map(image=>image.image_path).filter(Boolean);if(imagePath&&!paths.includes(imagePath))paths.push(imagePath);const {error}=await db.from('shop_products').delete().eq('id',id);if(error)return fail(error.message);if(paths.length)await db.storage.from('shop-images').remove(paths);await loadCatalog();toast('تم حذف المنتج')}

$('categoryForm').addEventListener('submit',async event=>{event.preventDefault();const {error}=await db.from('shop_categories').insert({name:$('categoryName').value.trim()});if(error)return fail(error.message);event.target.reset();await loadCatalog();toast('تمت إضافة القسم')});
async function saveCategoryDiscount(id){
  const percent=Math.min(100,Math.max(0,Number($(`catDiscount-${id}`).value)||0));
  const active=$(`catActive-${id}`).checked&&percent>0;
  const {error}=await db.from('shop_categories').update({discount_percent:percent,discount_active:active}).eq('id',id);
  if(error)return fail(error.message);
  await loadCatalog();toast(active?`تم تطبيق خصم ${percent}% على القسم`:'تم إلغاء خصم القسم');
}
async function deleteCategory(id,name){if(products.some(product=>product.category_id===id))return fail('احذفي منتجات هذا القسم أولًا');if(!confirm(`حذف قسم ${name}؟`))return;const {error}=await db.from('shop_categories').delete().eq('id',id);if(error)return fail(error.message);await loadCatalog();toast('تم حذف القسم')}

$('slideForm').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;button.textContent='جارٍ الحفظ...';
  try{
    const files=Array.from($('slideImages').files);if(!files.length)throw new Error('اختاري صورة واحدة على الأقل');if(slides.length+files.length>8)throw new Error('الحد الأقصى 8 صور');
    for(const [index,file] of files.entries()){validateImage(file,7,'صورة السلايدر');const extension=file.name.split('.').pop().toLowerCase();const image_path=`slides/${Date.now()}-${crypto.randomUUID()}.${extension}`;const {error:uploadError}=await db.storage.from('shop-images').upload(image_path,file,{contentType:file.type});if(uploadError)throw uploadError;const image_url=db.storage.from('shop-images').getPublicUrl(image_path).data.publicUrl;const {error}=await db.from('shop_slides').insert({image_url,image_path,sort_order:slides.length+index});if(error)throw error}
    event.target.reset();await loadSlides();toast('تمت إضافة صور السلايدر');
  }catch(error){fail(error.message)}finally{button.disabled=false;button.textContent='إضافة الصور إلى السلايدر'}
});
async function deleteSlide(id,imagePath){if(!confirm('حذف هذه الصورة من السلايدر؟'))return;const {error}=await db.from('shop_slides').delete().eq('id',id);if(error)return fail(error.message);if(imagePath)await db.storage.from('shop-images').remove([imagePath]);await loadSlides();toast('تم حذف الصورة')}
function validateImage(file,maxMB,label){if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error(`${label} يجب أن تكون JPG أو PNG أو WEBP`);if(file.size>maxMB*1024*1024)throw new Error(`${label} أكبر من ${maxMB}MB`)}

$('logoForm').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;button.textContent='جارٍ الحفظ...';
  try{
    const file=$('logoImage').files[0];if(!file)throw new Error('اختاري ملف اللوجو');validateImage(file,5,'اللوجو');
    const extension=file.name.split('.').pop().toLowerCase();const imagePath=`appearance/logo-${Date.now()}.${extension}`;
    const {error:uploadError}=await db.storage.from('shop-images').upload(imagePath,file,{contentType:file.type});if(uploadError)throw uploadError;
    const logo_image_url=db.storage.from('shop-images').getPublicUrl(imagePath).data.publicUrl;
    const {error}=await db.from('shop_settings').upsert({id:1,logo_image_url,updated_at:new Date().toISOString()});if(error)throw error;
    settings.logo_image_url=logo_image_url;renderLogo();event.target.reset();toast('تم تحديث لوجو المتجر');
  }catch(error){fail(error.message)}finally{button.disabled=false;button.textContent='حفظ اللوجو'}
});

function inputList(value){return value.split(/[,،]/).map(item=>item.trim()).filter(Boolean)}
function updateVariantBuilder(changed){
  if(changed==='size'&&$('pUseSizes').checked)$('pUseNumbers').checked=false;
  if(changed==='number'&&$('pUseNumbers').checked)$('pUseSizes').checked=false;
  const useColors=$('pUseColors').checked,useSizes=$('pUseSizes').checked,useNumbers=$('pUseNumbers').checked,hasOptions=useColors||useSizes||useNumbers;
  $('pType').value=useNumbers?'shoes':useSizes?'clothing':'regular';
  $('variantBuilder').classList.remove('hidden');
  $('sizeOptionField').classList.toggle('hidden',!useSizes);
  $('numberOptionField').classList.toggle('hidden',!useNumbers);
  $('buildVariantsButton').classList.remove('hidden');
  $('regularStockField').classList.add('hidden');$('pStock').required=false;
  $('variantMatrix').innerHTML='';
}
function buildVariantMatrix(){
  const useColors=$('pUseColors').checked,useSizes=$('pUseSizes').checked,useNumbers=$('pUseNumbers').checked;
  const colors=useColors?inputList($('pColors').value):[''];
  const options=useSizes?inputList($('pSizesInput').value):useNumbers?inputList($('pNumbersInput').value):[''];
  if(useColors&&!colors.length)return fail('اكتبي لونًا واحدًا على الأقل');
  if((useSizes||useNumbers)&&!options.length)return fail(useNumbers?'اكتبي نمرة واحدة على الأقل':'اكتبي مقاسًا واحدًا على الأقل');
  const optionLabel=useNumbers?'النمرة':useSizes?'المقاس':'';
  const headings=[useColors?'اللون':'',optionLabel,'الكمية'].filter(Boolean);
  const rows=colors.flatMap(color=>options.map(option=>({color,option})));
  $('variantMatrix').classList.toggle('single-axis',!(useColors&&(useSizes||useNumbers)));
  $('variantMatrix').innerHTML=`<div class="variant-matrix-head">${headings.map(label=>`<b>${label}</b>`).join('')}</div>`+rows.map(row=>`<div class="variant-matrix-row" data-color="${safe(row.color)}" data-option="${safe(row.option)}">${useColors?`<span>${safe(row.color)}</span>`:''}${(useSizes||useNumbers)?`<span>${safe(row.option)}</span>`:''}<input type="number" min="0" value="0" aria-label="الكمية"></div>`).join('');
}
function collectVariantRows(){const hasOptions=$('pUseColors').checked||$('pUseSizes').checked||$('pUseNumbers').checked;if(!hasOptions)return[];const rows=[...document.querySelectorAll('.variant-matrix-row')];if(!rows.length)throw new Error('اضغطي إنشاء جدول الكميات وحددي مخزون كل خيار');return rows.map(row=>({color:row.dataset.color||null,option_value:row.dataset.option||null,stock:Math.max(0,Number(row.querySelector('input').value)||0)}))}

function inputList(id){return $(id).value.split(/[,،]/).map(value=>value.trim()).filter(Boolean)}
function renderImageColorAssignments(){
  const box=$('imageColorAssignments'),files=Array.from($('pImage').files),colors=inputList('pColors');if(!box)return;
  box.innerHTML=files.length?`<h4>اربطي كل صورة بلونها</h4><div class="image-assign-grid">${files.map((file,index)=>`<article><img src="${URL.createObjectURL(file)}" alt=""><select class="image-color-select"><option value="">كل الألوان</option>${colors.map(color=>`<option value="${safe(color)}">${safe(color)}</option>`).join('')}</select></article>`).join('')}</div>`:'';
}
function renderCurrentProductImages(product){
  const box=$('currentProductImages');if(!product||!product.images?.length){box.classList.add('hidden');box.innerHTML='';return}
  const colors=product.colors||[];box.classList.remove('hidden');box.innerHTML=`<h4>الصور الحالية</h4><div class="image-assign-grid">${product.images.map(image=>`<article><img src="${safe(image.image_url)}" alt=""><select onchange="updateExistingImageColor('${image.id}',this.value)"><option value="">كل الألوان</option>${colors.map(color=>`<option value="${safe(color)}" ${image.color===color?'selected':''}>${safe(color)}</option>`).join('')}</select><button type="button" class="danger" onclick="deleteExistingProductImage('${image.id}','${safe(image.image_path||'')}','${product.id}')">حذف الصورة</button></article>`).join('')}</div>`}
async function updateExistingImageColor(id,color){const {error}=await db.from('shop_product_images').update({color:color||null}).eq('id',id);if(error)return fail(error.message);const image=products.flatMap(p=>p.images||[]).find(i=>i.id===id);if(image)image.color=color||null;toast('تم ربط الصورة باللون')}
async function deleteExistingProductImage(id,path,productId){if(!confirm('حذف هذه الصورة؟'))return;const {error}=await db.from('shop_product_images').delete().eq('id',id);if(error)return fail(error.message);if(path)await db.storage.from('shop-images').remove([path]);await loadCatalog();editProduct(productId)}
function editProduct(id){
  const product=products.find(item=>item.id===id);if(!product)return;adminPage('products');$('editingProductId').value=id;$('productFormTitle').textContent=`تعديل: ${product.name}`;$('saveProductButton').textContent='حفظ التعديلات';$('cancelProductEdit').classList.remove('hidden');
  $('pName').value=product.name||'';$('pCategory').value=product.category_id||'';$('pPrice').value=product.price||0;$('pShortDescription').value=product.short_description||'';$('pDescription').value=product.description||'';$('pColors').value=(product.colors||[]).join('، ');$('pUseColors').checked=true;$('pUseSizes').checked=product.product_type==='clothing';$('pUseNumbers').checked=product.product_type==='shoes';$('pSizesInput').value=(product.sizes||[]).join('، ');$('pNumbersInput').value=(product.shoe_sizes||[]).join('، ');updateVariantBuilder();buildVariantMatrix();
  document.querySelectorAll('.variant-matrix-row').forEach(row=>{const variant=(product.variants||[]).find(item=>(item.color||'')===row.dataset.color&&(item.option_value||'')===row.dataset.option);row.querySelector('input').value=variant?.stock||0});renderCurrentProductImages(product);renderImageColorAssignments();$('productForm').scrollIntoView({behavior:'smooth',block:'start'});
}
function cancelProductEdit(){$('productForm').reset();$('editingProductId').value='';$('productFormTitle').textContent='منتج جديد';$('saveProductButton').textContent='حفظ المنتج';$('cancelProductEdit').classList.add('hidden');$('pUseColors').checked=true;$('currentProductImages').classList.add('hidden');$('currentProductImages').innerHTML='';$('imageColorAssignments').innerHTML='';updateVariantBuilder()}
function renderInventory(){
  const box=$('inventoryTable');if(!box)return;box.innerHTML=products.length?products.map(product=>`<section class="inventory-product"><header><div><b>${safe(product.name)}</b><small>${safe(product.category)}</small></div><strong>${product.stock} قطعة</strong></header>${product.variants?.length?product.variants.map(v=>`<label><span>${safe([v.color,v.option_value].filter(Boolean).join(' / '))}</span><input class="inventory-variant-input" data-id="${v.id}" data-product="${product.id}" type="number" min="0" value="${v.stock}"></label>`).join(''):`<label><span>الكمية المتوفرة</span><input class="inventory-product-input" data-product="${product.id}" type="number" min="0" value="${product.stock}"></label>`}</section>`).join(''):'<div class="empty">لا توجد منتجات.</div>'}
async function saveAllInventory(){
  const button=$('saveInventoryButton');button.disabled=true;button.textContent='جارٍ الحفظ...';try{for(const input of document.querySelectorAll('.inventory-variant-input')){const {error}=await db.from('shop_product_variants').update({stock:Math.max(0,Number(input.value)||0)}).eq('id',input.dataset.id);if(error)throw error}for(const product of products){const variantInputs=[...document.querySelectorAll(`.inventory-variant-input[data-product="${product.id}"]`)];const plain=document.querySelector(`.inventory-product-input[data-product="${product.id}"]`),stock=variantInputs.length?variantInputs.reduce((sum,input)=>sum+Math.max(0,Number(input.value)||0),0):Math.max(0,Number(plain?.value)||0);const {error}=await db.from('shop_products').update({stock}).eq('id',product.id);if(error)throw error}await loadCatalog();renderInventory();toast('تم حفظ المخزون')}catch(error){fail(error.message)}finally{button.disabled=false;button.textContent='حفظ جميع الكميات'}}

let detailImages=[],detailAllImages=[],detailImageIndex=0,detailTouchStart=0,detailVariants=[],detailVariantLabel='المقاس',detailSelectedColor='',detailSelectedOption='';
function openProduct(id){
  const product=products.find(item=>item.id===id);if(!product)return;
  detailAllImages=product.images?.length?product.images:[{image_url:product.image_url}];detailImages=detailAllImages;detailImageIndex=0;
  const legacyOptions=product.product_type==='shoes'?(product.shoe_sizes||[]):(product.sizes||[]),legacyColors=product.colors?.length?product.colors:[''];
  detailVariants=(product.variants||[]).length?product.variants:legacyColors.flatMap(color=>(legacyOptions.length?legacyOptions:['']).map(option_value=>({id:'',color,option_value,stock:product.stock})));
  detailVariantLabel=product.product_type==='shoes'?'النمرة':'المقاس';
  const firstAvailable=detailVariants.find(row=>Number(row.stock)>0)||detailVariants[0];detailSelectedColor=firstAvailable?.color||'';detailSelectedOption=firstAvailable?.option_value||'';
  const unavailable=detailVariants.length&&!detailVariants.some(variant=>Number(variant.stock)>0);
  $('overlay').innerHTML=`<div class="modal" onclick="closeOverlay()"><article class="product-detail shein-detail" onclick="event.stopPropagation()"><button class="detail-close" onclick="closeOverlay()">×</button><div class="detail-gallery"><div class="detail-main-wrap" ontouchstart="detailTouchStart=event.touches[0].clientX" ontouchend="handleDetailSwipe(event)"><img id="detailMainImage" src="${safe(detailImages[0]?.image_url||'')}" alt="${safe(product.name)}"><button class="gallery-side gallery-left" onclick="moveDetailImage(-1)">‹</button><button class="gallery-side gallery-right" onclick="moveDetailImage(1)">›</button></div><div class="detail-thumbs">${detailImages.map((image,index)=>`<button onclick="showDetailImage(${index})" class="${index===0?'active':''}"><img src="${safe(image.image_url)}" alt=""></button>`).join('')}</div></div><div class="detail-info"><small>${safe(product.category)}</small><h2>${safe(product.name)}</h2><strong>${money(product.price)}</strong>${product.description?`<p>${safe(product.description)}</p>`:''}<div id="variantPicker" class="shein-picker"></div><button class="primary detail-add" ${Number(product.stock)<1||unavailable?'disabled':''} onclick="addConfiguredProduct('${product.id}')">${Number(product.stock)<1||unavailable?'SOLD OUT':'إضافة إلى السلة'}</button></div></article></div>`;
  renderDetailVariantPicker();
}
function uniqueValues(values){return [...new Set(values.filter(Boolean))]}
function renderDetailVariantPicker(){
  const box=$('variantPicker');if(!box||!detailVariants.length)return;
  const colors=uniqueValues(detailVariants.map(row=>row.color)),hasOptions=detailVariants.some(row=>row.option_value);
  if(colors.length&&!colors.includes(detailSelectedColor))detailSelectedColor=colors[0];
  const matching=detailVariants.filter(row=>!colors.length||row.color===detailSelectedColor),options=uniqueValues(matching.map(row=>row.option_value));
  if(hasOptions&&!options.includes(detailSelectedOption))detailSelectedOption=options.find(option=>matching.some(row=>row.option_value===option&&Number(row.stock)>0))||options[0]||'';
  const selected=detailVariants.find(row=>(!colors.length||row.color===detailSelectedColor)&&(!hasOptions||row.option_value===detailSelectedOption));
  box.innerHTML=`${colors.length?`<section class="picker-group"><div><b>اللون</b><span>${safe(detailSelectedColor)}</span></div><div class="picker-choices">${colors.map((color,index)=>{const available=detailVariants.some(row=>row.color===color&&Number(row.stock)>0);return `<button type="button" class="color-choice ${color===detailSelectedColor?'active':''} ${available?'':'disabled'}" onclick="chooseDetailColor(${index})" ${available?'':'disabled'}><i style="--choice-color:${colorCode(color)}"></i>${safe(color)}</button>`}).join('')}</div></section>`:''}${hasOptions?`<section class="picker-group"><div><b>${detailVariantLabel}</b><span>${safe(detailSelectedOption)}</span></div><div class="picker-choices">${options.map((option,index)=>{const row=matching.find(item=>item.option_value===option),available=Number(row?.stock)>0;return `<button type="button" class="size-choice ${option===detailSelectedOption?'active':''} ${available?'':'disabled'}" onclick="chooseDetailOption(${index})" ${available?'':'disabled'}>${safe(option)}</button>`}).join('')}</div></section>`:''}<input id="selectedVariantId" type="hidden" value="${safe(selected?.id||'')}" data-options="${safe([detailSelectedColor?`اللون: ${detailSelectedColor}`:'',hasOptions?`${detailVariantLabel}: ${detailSelectedOption}`:''].filter(Boolean).join('، '))}">`;
}
function colorCode(color){const map={أسود:'#171714',ابيض:'#f5f5f2','أبيض':'#f5f5f2',بيج:'#d9c3a5',بني:'#704936',ذهبي:'#c9a24e',فضي:'#b8bcc2',أحمر:'#a83232',ازرق:'#315d92','أزرق':'#315d92',اخضر:'#497052','أخضر':'#497052',زهري:'#d992a7'};return map[color]||'#d8d1c6'}
function chooseDetailColor(index){const colors=uniqueValues(detailVariants.map(row=>row.color));detailSelectedColor=colors[index]||'';detailSelectedOption='';detailImages=detailAllImages.filter(image=>!image.color||image.color===detailSelectedColor);if(!detailImages.length)detailImages=detailAllImages;detailImageIndex=0;renderDetailGallery();renderDetailVariantPicker()}
function renderDetailGallery(){const main=$('detailMainImage'),thumbs=document.querySelector('.detail-thumbs');if(!main||!thumbs)return;main.src=detailImages[0]?.image_url||'';thumbs.innerHTML=detailImages.map((image,index)=>`<button onclick="showDetailImage(${index})" class="${index===0?'active':''}"><img src="${safe(image.image_url)}" alt=""></button>`).join('')}
function chooseDetailOption(index){const options=uniqueValues(detailVariants.filter(row=>!detailSelectedColor||row.color===detailSelectedColor).map(row=>row.option_value));detailSelectedOption=options[index]||'';renderDetailVariantPicker()}
function showDetailImage(index){if(!detailImages.length)return;detailImageIndex=(index+detailImages.length)%detailImages.length;$('detailMainImage').src=detailImages[detailImageIndex].image_url;document.querySelectorAll('.detail-thumbs button').forEach((button,i)=>button.classList.toggle('active',i===detailImageIndex))}
function moveDetailImage(change){showDetailImage(detailImageIndex+change)}
function handleDetailSwipe(event){const end=event.changedTouches[0].clientX;if(Math.abs(end-detailTouchStart)>45)moveDetailImage(end<detailTouchStart?1:-1)}
function addConfiguredProduct(id){const product=products.find(item=>item.id===id);if(!product||Number(product.stock)<1)return;const choice=$('selectedVariantId'),hasOptions=detailVariants.length;if(hasOptions&&!choice)return fail('اختاري خيارات المنتج أولًا');const selectedOptions=choice?.dataset.options||'',selectedVariantId=choice?.value||'';const variant=product.variants?.find(row=>row.id===selectedVariantId);const limit=variant?Number(variant.stock):Number(product.stock);const item=cart.find(row=>row.product.id===id&&row.selectedVariantId===selectedVariantId&&row.selectedOptions===selectedOptions);if(item){if(item.quantity>=limit)return toast('وصلتِ إلى الكمية المتوفرة من هذا الخيار');item.quantity++}else cart.push({product,quantity:1,selectedOptions,selectedVariantId,variantStock:limit});syncCart();closeOverlay();toast('تمت الإضافة إلى السلة')}
function changeQuantity(id,change){const item=cart.find(row=>row.product.id===id);if(!item)return;const next=item.quantity+change,limit=Number(item.variantStock||item.product.stock);if(next>limit)return toast('لا توجد كمية إضافية من هذا الخيار');item.quantity=next;syncCart();openCart()}

async function submitOrder(event){event.preventDefault();const button=event.submitter;button.disabled=true;button.textContent='جارٍ تسجيل الطلب...';$('checkoutError').textContent='';try{const zone=selectedDeliveryZone(),finalTotal=cartSubtotal()+Number(zone.price),firstName=$('customerFirstName').value.trim(),lastName=$('customerLastName').value.trim(),phone=`${$('customerPhonePrefix').value}${$('customerPhone').value.trim().replace(/^0+/,'')}`,city=`${zone.name} - ${$('customerCity').value.trim()}`,items=cart.map(item=>({product_id:item.product.id,quantity:item.quantity,selected_options:item.selectedOptions||'',selected_variant_id:item.selectedVariantId||''}));const {error}=await db.rpc('create_shop_order',{p_customer_name:`${firstName} ${lastName}`,p_customer_phone:phone,p_customer_city:city,p_customer_address:$('customerAddress').value.trim(),p_customer_notes:$('customerNotes').value.trim(),p_payment_method:'cash',p_delivery_fee:Number(zone.price),p_items:items});if(error)throw error;cart=[];syncCart();await loadCatalog();$('overlay').innerHTML=`<div class="modal"><div class="order-success"><span class="success-icon">✓</span><h2>تم استلام طلبكِ</h2><p>الإجمالي مع توصيل ${safe(zone.name)}: <b>${money(finalTotal)}</b></p><p>سيتم التواصل معكِ على واتساب لتأكيد التوصيل.</p><button class="primary" onclick="closeOverlay()">العودة إلى المتجر</button></div></div>`}catch(error){$('checkoutError').textContent=error.message||'تعذر تسجيل الطلب';button.disabled=false;button.textContent='تأكيد الطلب'}}

async function loadOrders(){if(!isAdmin)return;const {data,error}=await db.from('shop_orders').select('*,shop_order_items(*)').order('created_at',{ascending:false});if(error){$('adminOrders').innerHTML='<div class="empty">تعذر تحميل الطلبات.</div>';return}orders=data||[];const newCount=orders.filter(order=>order.status==='new').length;$('ordersBadge').textContent=newCount;$('ordersBadge').classList.toggle('hidden',!newCount);$('adminOrders').innerHTML=orders.length?orders.map(order=>`<article class="order-card"><header><div><span class="order-number">#${safe(order.order_number)}</span><small>${new Date(order.created_at).toLocaleString('ar')}</small></div><span class="status status-${safe(order.status)}">${orderStatusLabels[order.status]||safe(order.status)}</span></header><div class="order-customer"><b>${safe(order.customer_name)}</b><a href="tel:${safe(order.customer_phone)}">${safe(order.customer_phone)}</a><span>${safe(order.customer_city)}، ${safe(order.customer_address)}</span>${order.notes?`<small>ملاحظة: ${safe(order.notes)}</small>`:''}</div><div class="order-items">${(order.shop_order_items||[]).map(item=>`<div class="admin-order-line"><span><b>${safe(item.product_name)}</b> × ${item.quantity}${item.selected_options?`<small>${safe(item.selected_options)}</small>`:''}</span><b>${money(item.line_total)}</b></div>`).join('')}</div><div class="order-footer"><div><small>${paymentLabels[order.payment_method]||safe(order.payment_method)}</small><strong>${money(order.total)}</strong></div><select onchange="updateOrderStatus('${order.id}',this.value)">${Object.entries(orderStatusLabels).map(([value,label])=>`<option value="${value}" ${order.status===value?'selected':''}>${label}</option>`).join('')}</select></div></article>`).join(''):'<div class="empty">لا توجد طلبات حتى الآن.</div>'}
async function updateOrderStatus(id,status){if(status==='cancelled'){if(!confirm('سيتم حذف الطلب نهائيًا من القائمة، هل أنتِ متأكدة؟'))return loadOrders();const {error}=await db.from('shop_orders').delete().eq('id',id);if(error)return fail(error.message);toast('تم حذف الطلب');return loadOrders()}const {error}=await db.from('shop_orders').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)return fail(error.message);toast('تم تحديث حالة الطلب');await loadOrders()}
function changeQuantityByIndex(index,change){const item=cart[index];if(!item)return;const next=item.quantity+change,limit=Number(item.variantStock||item.product.stock);if(next>limit)return toast('لا توجد كمية إضافية من هذا الخيار');item.quantity=next;syncCart();openCart()}
function openCart(){
  $('overlay').innerHTML=`<div class="modal" onclick="closeOverlay()"><div class="cart cart-wide" onclick="event.stopPropagation()"><header><div><span class="eyebrow">مراجعة الطلب</span><h2>سلة التسوق</h2></div><button onclick="closeOverlay()">×</button></header>${cart.length?`<div class="cart-lines">${cart.map((item,index)=>`<div class="cart-item"><img src="${safe(item.product.image_url||'')}" alt=""><div class="cart-item-info"><b>${safe(item.product.name)}</b>${item.selectedOptions?`<small>${safe(item.selectedOptions)}</small>`:''}<small>${money(item.product.price)}</small><div class="quantity"><button onclick="changeQuantityByIndex(${index},1)">＋</button><span>${item.quantity}</span><button onclick="changeQuantityByIndex(${index},-1)">−</button></div></div><strong>${money(Number(item.product.price)*item.quantity)}</strong><button class="remove-item" onclick="removeCartItemByIndex(${index})">حذف</button></div>`).join('')}</div><div class="cart-summary"><p><span>مجموع المنتجات</span><b>${money(cartSubtotal())}</b></p><p><span>التوصيل</span><b>يُحدد حسب المنطقة</b></p></div><button class="primary checkout-button" onclick="openCheckout()">إكمال الطلب</button>`:'<div class="empty-cart"><p>السلة فارغة.</p><button class="text-button" onclick="closeOverlay()">متابعة التسوق</button></div>'}</div></div>`
}
async function loadOrders(){if(!isAdmin)return;const {data,error}=await db.from('shop_orders').select('*,shop_order_items(*)').order('created_at',{ascending:false});if(error){$('adminOrders').innerHTML='<div class="empty">تعذر تحميل الطلبات.</div>';return}orders=data||[];const newCount=orders.filter(order=>order.status==='new').length;$('ordersBadge').textContent=newCount;$('ordersBadge').classList.toggle('hidden',!newCount);$('adminOrders').innerHTML=orders.length?orders.map(order=>`<button class="order-summary" onclick="openOrderDetails('${order.id}')"><div><span class="order-number">طلب #${safe(order.order_number)}</span><b>${safe(order.customer_name)}</b><small>${new Date(order.created_at).toLocaleString('ar')}</small></div><div><span class="status status-${safe(order.status)}">${orderStatusLabels[order.status]||safe(order.status)}</span><strong>${money(order.total)}</strong><small>${(order.shop_order_items||[]).reduce((sum,item)=>sum+Number(item.quantity),0)} قطعة</small></div></button>`).join(''):'<div class="empty">لا توجد طلبات حتى الآن.</div>'}
function orderItemImage(item){const current=products.find(product=>product.id===item.product_id);return current?.image_url||item.image_url||''}
function renderOrders(){const box=$('adminOrders');if(!box)return;const query=($('orderSearch')?.value||'').trim().toLowerCase(),status=$('orderStatusFilter')?.value||'',filtered=orders.filter(order=>(!status||order.status===status)&&(!query||`${order.customer_name} ${order.customer_phone} ${order.order_number}`.toLowerCase().includes(query)));box.innerHTML=filtered.length?filtered.map(order=>`<button class="order-summary" onclick="openOrderDetails('${order.id}')"><div><span class="order-number">طلب #${safe(order.order_number)}</span><b>${safe(order.customer_name)}</b><small>${new Date(order.created_at).toLocaleString('ar')}</small></div><div><span class="status status-${safe(order.status)}">${orderStatusLabels[order.status]||safe(order.status)}</span><strong>${money(order.total)}</strong><small>${(order.shop_order_items||[]).reduce((sum,item)=>sum+Number(item.quantity),0)} قطعة</small></div></button>`).join(''):'<div class="empty">لا توجد طلبات مطابقة.</div>'}
async function loadOrders(){if(!isAdmin)return;const {data,error}=await db.from('shop_orders').select('*,shop_order_items(*)').order('created_at',{ascending:false});if(error){$('adminOrders').innerHTML='<div class="empty">تعذر تحميل الطلبات.</div>';return}orders=data||[];const newCount=orders.filter(order=>order.status==='new').length;$('ordersBadge').textContent=newCount;$('ordersBadge').classList.toggle('hidden',!newCount);renderOrders()}
async function updateOrderStatus(id,status){const {error}=await db.from('shop_orders').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)return fail(error.message);toast('تم تحديث حالة الطلب');await loadOrders()}
function orderText(order){return [`طلب #${order.order_number}`,`العميلة: ${order.customer_name}`,`الهاتف: ${order.customer_phone}`,`العنوان: ${order.customer_city} - ${order.customer_address}`,'',...(order.shop_order_items||[]).map(item=>`${item.product_name} × ${item.quantity}${item.selected_options?` (${item.selected_options})`:''}`),'',`الإجمالي: ${money(order.total)}`].join('\n')}
function sendOrderWhatsApp(id){const order=orders.find(item=>item.id===id);if(order)window.open(`https://wa.me/${String(CFG.whatsapp||'').replace(/\D/g,'')}?text=${encodeURIComponent(orderText(order))}`,'_blank')}
function printOrder(id){const order=orders.find(item=>item.id===id);if(!order)return;const win=window.open('','_blank');win.document.write(`<html dir="rtl"><head><title>طلب ${safe(order.order_number)}</title><style>body{font-family:Arial;padding:30px}li{margin:12px 0}.total{font-size:20px;font-weight:bold}</style></head><body><h1>طلب #${safe(order.order_number)}</h1><h2>${safe(order.customer_name)}</h2><p>${safe(order.customer_phone)}</p><p>${safe(order.customer_city)} — ${safe(order.customer_address)}</p><hr><ul>${(order.shop_order_items||[]).map(item=>`<li>${safe(item.product_name)} × ${item.quantity} ${item.selected_options?`— ${safe(item.selected_options)}`:''} — ${money(item.line_total)}</li>`).join('')}</ul><p class="total">الإجمالي: ${money(order.total)}</p></body></html>`);win.document.close();win.print()}
async function deleteOrder(id){if(!confirm('حذف الطلب نهائيًا؟ استخدمي هذا فقط بعد إنهائه أو تسليمه.'))return;const {error}=await db.from('shop_orders').delete().eq('id',id);if(error)return fail(error.message);closeOverlay();await loadOrders();toast('تم حذف الطلب')}
function openOrderDetails(id){const order=orders.find(item=>item.id===id);if(!order)return;$('overlay').innerHTML=`<div class="modal" onclick="closeOverlay()"><article class="order-detail-modal" onclick="event.stopPropagation()"><header><div><span class="eyebrow">تفاصيل الطلب #${safe(order.order_number)}</span><h2>${safe(order.customer_name)}</h2></div><button onclick="closeOverlay()">×</button></header><section class="order-delivery-details"><div><small>رقم الهاتف</small><a href="tel:${safe(order.customer_phone)}">${safe(order.customer_phone)}</a></div><div><small>منطقة ومدينة التوصيل</small><b>${safe(order.customer_city)}</b></div><div class="wide"><small>العنوان بالتفصيل</small><b>${safe(order.customer_address)}</b></div>${order.notes?`<div class="wide"><small>ملاحظات</small><b>${safe(order.notes)}</b></div>`:''}</section><h3>القطع المطلوبة</h3><div class="order-products-detail">${(order.shop_order_items||[]).map(item=>`<div class="order-product-detail"><div class="order-product-image">${orderItemImage(item)?`<img src="${safe(orderItemImage(item))}" alt="${safe(item.product_name)}" onerror="this.parentElement.classList.add('image-error');this.remove()">`:'<span>بدون صورة</span>'}</div><div><b>${safe(item.product_name)}</b>${item.selected_options?`<small>${safe(item.selected_options)}</small>`:''}<span>العدد: ${item.quantity}</span></div><strong>${money(item.line_total)}</strong></div>`).join('')}</div><div class="order-costs"><p><span>المنتجات</span><b>${money(order.subtotal)}</b></p><p><span>التوصيل</span><b>${money(order.delivery_fee)}</b></p><p><span>الإجمالي</span><strong>${money(order.total)}</strong></p></div><div class="order-detail-actions"><select id="detailOrderStatus">${Object.entries(orderStatusLabels).map(([value,label])=>`<option value="${value}" ${order.status===value?'selected':''}>${label}</option>`).join('')}</select><button class="primary" onclick="updateOrderStatus('${order.id}',$('detailOrderStatus').value);closeOverlay()">حفظ الحالة</button><button class="outline-button" onclick="sendOrderWhatsApp('${order.id}')">واتساب</button><button class="outline-button" onclick="printOrder('${order.id}')">طباعة</button><button class="danger" onclick="deleteOrder('${order.id}')">حذف نهائي</button></div></article></div>`}

boot();
